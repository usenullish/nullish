import type { Tx } from "@usenullish/nullish-db";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { BankMovementStatus, EXCHANGE_RATE_ONE } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import type { Services } from "@usenullish/nullish-schema/services";
import { MovementService, type MovementServiceArgs } from "./_movement";
import { EngineError } from "../../errors";
import { getAccountingSetting } from "../../core/_helpers/accounting-settings";
import { getBankRelation } from "../../core/_helpers/bank-relations";
import { CreateJournalService } from "../../ledger/services/journal/journal.create";
import { type CreateJournalValues } from "../../ledger/services/journal/_journal.create";
import { insertMovementJournalEntry } from "../_helpers/movement-journal";

type BankRelation = Records["Core"]["BankRelations"]["Select"];
type Movement = Records["Banking"]["Movements"]["Select"];

type ReconcileWithAccountArgs = Omit<
  Extract<Services["Banking"]["ReconcileMovement"]["Args"], { type: "account" }>,
  "type"
>;

class MovementForeignCurrencyError extends EngineError {}

export class ReconcileAccountService extends MovementService {
  readonly #args: MovementServiceArgs;

  private constructor(args: MovementServiceArgs) {
    super(args);

    this.#args = args;
  }

  static create(args: MovementServiceArgs): ReconcileAccountService {
    return new this(args);
  }

  reconcile(args: ReconcileWithAccountArgs): Promise<Result<Movement>> {
    return this._withViewRefresh(async () => {
      return await this.#reconcile(args);
    });
  }

  #reconcile({
    accountId,
    description,
    vatRateId,
  }: ReconcileWithAccountArgs): Promise<Result<Movement>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const movement = await this._loadMovement({ tx });

        this._assertMovementUnreconciled({ movement });

        await this.#assertMovementInBaseCurrency({ tx, movement });

        const bankRelation = await getBankRelation({
          tx,
          id: movement.bankRelationId,
        });

        const { db, userId } = this.#args;

        const journalService = CreateJournalService.create({
          db,
          userId,
          organizationId: movement.organizationId,
        });

        const {
          entry: { id: journalEntryId },
        } = await journalService.__createInTx__({
          tx,
          values: this.#prepareJournal({
            movement,
            bankRelation,
            accountId,
            description,
            vatRateId,
          }),
        });

        await insertMovementJournalEntry({
          tx,
          organizationId: movement.organizationId,
          movementId: movement.id,
          journalEntryId,
        });

        return await this._updateMovementStatus({
          tx,
          movementId: movement.id,
          status: BankMovementStatus.RECONCILED,
        });
      });
    });
  }

  #prepareJournal({
    movement: { amount, currency, bookedOn },
    bankRelation,
    accountId,
    description,
    vatRateId,
  }: {
    movement: Movement;
    bankRelation: BankRelation;
  } & Pick<
    ReconcileWithAccountArgs,
    "accountId" | "description" | "vatRateId"
  >): CreateJournalValues {
    const incoming = amount > 0n;
    const value = incoming ? amount : -amount;

    const posting = {
      description,
      currency,
      exchangeRate: EXCHANGE_RATE_ONE,
      vatRateId: null,
    };

    return {
      entry: {
        validOn: bookedOn,
        reference: null,
      },
      postings: [
        {
          ...posting,
          accountId: bankRelation.accountId,
          debit: incoming ? value : 0n,
          credit: incoming ? 0n : value,
        },
        {
          ...posting,
          accountId,
          vatRateId: vatRateId ?? null,
          debit: incoming ? 0n : value,
          credit: incoming ? value : 0n,
        },
      ],
    };
  }

  async #assertMovementInBaseCurrency({
    tx,
    movement,
  }: {
    tx: Tx;
    movement: Movement;
  }): Promise<void> {
    const { baseCurrency } = await getAccountingSetting({
      tx,
      organizationId: movement.organizationId,
    });

    if (movement.currency !== baseCurrency) {
      throw new MovementForeignCurrencyError(
        `Bank movement ${movement.id} is in ${movement.currency}, only movements in ${baseCurrency} can be booked on an account for now`,
      );
    }
  }
}
