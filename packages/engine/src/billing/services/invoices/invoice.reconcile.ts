import { type InvoiceServiceArgs } from "./_invoice";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Tx } from "@usenullish/nullish-db";
import { BankMovementStatus, EXCHANGE_RATE_ONE } from "@usenullish/nullish-schema/db";
import { type Records } from "@usenullish/nullish-schema/records";
import { InvoiceWithPaymentService } from "./_invoice.with-payment";
import { insertMovementJournalEntry } from "../../../banking/_helpers/movement-journal";
import { getMovement, updateMovement } from "../../../banking/_helpers/movements";
import { getAccountingSetting } from "../../../core/_helpers/accounting-settings";
import { EngineError } from "../../../errors";

type SelectMovement = Records["Banking"]["Movements"]["Select"];

type JournalEntrySelect = Records["Ledger"]["JournalEntries"]["Select"];

class MovementAlreadyReconciledError extends EngineError {}
class MovementNotIncomingError extends EngineError {}
class MovementForeignCurrencyError extends EngineError {}

export class ReconcileInvoiceService extends InvoiceWithPaymentService {
  private constructor(args: InvoiceServiceArgs) {
    super(args);
  }

  static create(args: InvoiceServiceArgs): ReconcileInvoiceService {
    return new this(args);
  }

  reconcile({ movementId }: { movementId: SelectMovement["id"] }): Promise<Result<SelectMovement>> {
    return this._withViewRefresh(async () => {
      return await this.#reconcile({ movementId });
    });
  }

  #reconcile({
    movementId,
  }: {
    movementId: SelectMovement["id"];
  }): Promise<Result<SelectMovement>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        // 1. Load the movement
        const movement = await getMovement({
          tx,
          id: movementId,
          lock: "no key update",
        });

        // 2. Assert it's not yet reconciled and value is > 0 in expected currency
        await this.#assertMovement({ tx, movement });

        // 3. Use the invoice pay service to apply the payment with the accounting rules
        const { journalEntryId } = await this._pay({
          tx,
          bankRelationId: movement.bankRelationId,
          amount: movement.amount,
          currency: movement.currency,
          exchangeRate: EXCHANGE_RATE_ONE,
          validOn: movement.bookedOn,
        });

        // 4. Record a link between the movement and the journal entries
        await this.#recordMovement({
          tx,
          organizationId: movement.organizationId,
          movementId: movement.id,
          journalEntryId,
        });

        // 5. Update the status of the movement to reconciled
        return await this.#updateMovementStatusToReconciled({
          tx,
          movementId: movement.id,
        });
      });
    });
  }

  async #assertMovement({ tx, movement }: { tx: Tx; movement: SelectMovement }): Promise<void> {
    if (movement.status !== BankMovementStatus.UNRECONCILED) {
      throw new MovementAlreadyReconciledError(
        `Bank movement ${movement.id} is ${movement.status} and cannot be reconciled`,
      );
    }

    if (movement.amount <= 0n) {
      throw new MovementNotIncomingError(
        `Bank movement ${movement.id} is not an incoming payment and cannot pay an invoice`,
      );
    }

    const { baseCurrency } = await getAccountingSetting({
      tx,
      organizationId: movement.organizationId,
    });

    if (movement.currency !== baseCurrency) {
      throw new MovementForeignCurrencyError(
        `Bank movement ${movement.id} is in ${movement.currency}, only movements in ${baseCurrency} can be reconciled with an invoice for now`,
      );
    }
  }

  async #recordMovement({
    tx,
    organizationId,
    movementId,
    journalEntryId,
  }: {
    tx: Tx;
    organizationId: SelectMovement["organizationId"];
    movementId: SelectMovement["id"];
    journalEntryId: JournalEntrySelect["id"];
  }) {
    await insertMovementJournalEntry({
      tx,
      organizationId,
      movementId,
      journalEntryId,
    });
  }

  async #updateMovementStatusToReconciled({
    tx,
    movementId,
  }: {
    tx: Tx;
    movementId: SelectMovement["id"];
  }): Promise<SelectMovement> {
    return await updateMovement({
      tx,
      movementId,
      values: { status: BankMovementStatus.RECONCILED },
    });
  }
}
