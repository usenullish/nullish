import { type Result, tryCatch } from "@usenullish/nullish-common";
import { BankMovementStatus } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { MovementService, type MovementServiceArgs } from "./_movement";

type Movement = Records["Banking"]["Movements"]["Select"];

export class IgnoreMovementService extends MovementService {
  private constructor(args: MovementServiceArgs) {
    super(args);
  }

  static create(args: MovementServiceArgs): IgnoreMovementService {
    return new this(args);
  }

  ignore(): Promise<Result<Movement>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const movement = await this._loadMovement({ tx });

        this._assertMovementUnreconciled({ movement });

        return await this._updateMovementStatus({
          tx,
          movementId: movement.id,
          status: BankMovementStatus.IGNORED,
        });
      });
    });
  }
}
