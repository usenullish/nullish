import type { Result } from "@usenullish/nullish-common";
import type { Records } from "@usenullish/nullish-schema/records";
import { type Services, ServicesSchema } from "@usenullish/nullish-schema/services";
import { MovementService, type MovementServiceArgs } from "./_movement";
import { ReconcileAccountService } from "./_account.reconcile";
import { EngineError } from "../../errors";
import { ReconcileInvoiceService } from "../../billing/services/invoices/invoice.reconcile";

type Movement = Records["Banking"]["Movements"]["Select"];

type ReconcileMovementArgs = Services["Banking"]["ReconcileMovement"]["Args"];
type ReconcileWithInvoiceArgs = Extract<ReconcileMovementArgs, { type: "invoice" }>;
type ReconcileWithAccountArgs = Extract<ReconcileMovementArgs, { type: "account" }>;

class MovementReconcileUnsupportedTypeError extends EngineError {}

export class ReconcileMovementService extends MovementService {
  readonly #args: MovementServiceArgs;

  private constructor(args: MovementServiceArgs) {
    super(args);

    this.#args = args;
  }

  static create(args: MovementServiceArgs): ReconcileMovementService {
    return new this(args);
  }

  async reconcile(args: ReconcileMovementArgs): Promise<Result<Movement>> {
    const reconcileArgs = ServicesSchema.BankingSchema.ReconcileMovementArgsSchema.safeParse(args);

    if (!reconcileArgs.success) {
      return { status: "error", err: reconcileArgs.error };
    }

    const { data } = reconcileArgs;

    switch (data.type) {
      case "invoice":
        return await this.#reconcileWithInvoice(data);
      case "account":
        return await this.#reconcileWithAccount(data);
      default:
        return {
          status: "error",
          err: new MovementReconcileUnsupportedTypeError("The movement type is not supported"),
        };
    }
  }

  async #reconcileWithInvoice({
    invoiceId,
  }: Omit<ReconcileWithInvoiceArgs, "type">): Promise<Result<Movement>> {
    const { movementId, ...context } = this.#args;

    return await ReconcileInvoiceService.create({
      ...context,
      invoiceId,
    }).reconcile({
      movementId,
    });
  }

  async #reconcileWithAccount(
    args: Omit<ReconcileWithAccountArgs, "type">,
  ): Promise<Result<Movement>> {
    return await ReconcileAccountService.create(this.#args).reconcile(args);
  }
}
