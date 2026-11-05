import type { Result } from "@usenullish/nullish-common";
import { advisoryXactLock } from "@usenullish/nullish-db";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { AdminServiceContext, type AdminServiceContextArgs } from "../../_service";
import {
  deleteExpiredReservations,
  deleteReservation,
  insertReservation,
  getReservedTokens,
} from "../_helpers/reservations";
import { getUsedTokens } from "../_helpers/usages";

type SelectLlmReservations = Records["Metering"]["LlmReservations"]["Select"];
type SelectLlmUsages = Records["Metering"]["LlmUsages"]["Select"];

export enum LlmReservationType {
  RESERVED = "reserved",
  LIMIT_REACHED = "limit_reached",
}

export type LlmReservation =
  | { type: LlmReservationType.RESERVED; reservation: SelectLlmReservations }
  | { type: LlmReservationType.LIMIT_REACHED };

export class LlmUsageLimitService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): LlmUsageLimitService {
    return new this(args);
  }

  reserve({
    userId,
    model,
    from,
    limit,
    reservedTokens,
    expiresInSeconds,
  }: Pick<SelectLlmReservations, "userId" | "reservedTokens"> &
    Pick<SelectLlmUsages, "model"> & {
      from: Date;
      limit: bigint;
      expiresInSeconds: number;
    }): Promise<Result<LlmReservation>> {
    return this._withDbContext(async (tx) => {
      // Serializes the reservations of a user, so that two parallel requests cannot both read
      // the total before either inserted its reservation.
      await advisoryXactLock({ tx, key: `metering.llm_reservations.user:${userId}` });

      await deleteExpiredReservations({ tx, userId });

      const [usedTokens, openReservedTokens] = await Promise.all([
        getUsedTokens({ tx, userId, model, from }),
        getReservedTokens({ tx, userId }),
      ]);

      if (usedTokens + openReservedTokens >= limit) {
        return { type: LlmReservationType.LIMIT_REACHED };
      }

      const reservation = await insertReservation({ tx, userId, reservedTokens, expiresInSeconds });

      return { type: LlmReservationType.RESERVED, reservation };
    });
  }

  release({ userId, id }: Pick<SelectLlmReservations, "userId" | "id">): Promise<Result<void>> {
    return this._withDbContext(async (tx) => {
      await deleteReservation({ tx, userId, id });
    });
  }
}
