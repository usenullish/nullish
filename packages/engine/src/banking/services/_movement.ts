import type { DbUserContextArgs, Tx } from "@usenullish/nullish-db";
import { BankMovementStatus } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { EngineError } from "../../errors";
import { ServiceContext } from "../../_service/service";
import { getMovement, updateMovement } from "../_helpers/movements";

type Movement = Records["Banking"]["Movements"]["Select"];

export type MovementServiceArgs = DbUserContextArgs & { movementId: Movement["id"] };

class MovementAlreadyReconciledError extends EngineError {}

export abstract class MovementService extends ServiceContext {
  readonly #movementId: Movement["id"];

  protected constructor({ movementId, ...rest }: MovementServiceArgs) {
    super(rest);

    this.#movementId = movementId;
  }

  /**
   * Get the movement and lock it for the transaction, as we aim to update its status.
   */
  protected async _loadMovement({ tx }: { tx: Tx }): Promise<Movement> {
    return await getMovement({
      tx,
      id: this.#movementId,
      lock: "no key update",
    });
  }

  protected async _updateMovementStatus({
    status,
    ...rest
  }: {
    tx: Tx;
    movementId: Movement["id"];
    status: Movement["status"];
  }): Promise<Movement> {
    return await updateMovement({
      ...rest,
      values: { status },
    });
  }

  protected _assertMovementUnreconciled({ movement }: { movement: Movement }) {
    if (movement.status !== BankMovementStatus.UNRECONCILED) {
      throw new MovementAlreadyReconciledError(
        `Bank movement ${movement.id} is ${movement.status} and cannot be reconciled`,
      );
    }
  }
}
