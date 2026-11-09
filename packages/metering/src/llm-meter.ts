import {
  LlmReservationType,
  LlmUsageLimitService,
  LlmUsagesService,
} from "@usenullish/nullish-admin/metering";
import { isNullish, type Result } from "@usenullish/nullish-common";
import {
  envLlmChatModel,
  envLlmChatTokenLimit,
  LlmTokenLimitPeriod,
} from "@usenullish/nullish-env";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";

type SelectLlmReservations = Records["Metering"]["LlmReservations"]["Select"];
type SelectLlmUsages = Records["Metering"]["LlmUsages"]["Select"];
type InsertLlmUsages = Records["Metering"]["LlmUsages"]["Insert"];

type UserId = SelectLlmReservations["userId"];

export class LlmUsageLimitError extends Error {}

enum LlmMeterReservationType {
  NONE = "none",
  RESERVED = "reserved",
}

type LlmMeterReservation =
  | { type: LlmMeterReservationType.NONE }
  | { type: LlmMeterReservationType.RESERVED; reservation: SelectLlmReservations };

interface LlmMeterArgs {
  db: PostgresDbInstance;
  userId: UserId;
  reservation: LlmMeterReservation;
}

export class LlmMeter {
  readonly #db: PostgresDbInstance;
  readonly #userId: UserId;
  readonly #reservation: LlmMeterReservation;

  private constructor({ db, userId, reservation }: LlmMeterArgs) {
    this.#db = db;
    this.#userId = userId;
    this.#reservation = reservation;
  }

  static async open({
    db,
    userId,
    reservedTokens,
    expiresInSeconds,
  }: Pick<LlmMeterArgs, "db" | "userId"> &
    Pick<SelectLlmReservations, "reservedTokens"> & {
      expiresInSeconds: number;
    }): Promise<Result<LlmMeter>> {
    const limit = envLlmChatTokenLimit();

    if (isNullish(limit)) {
      return {
        status: "success",
        result: new this({ db, userId, reservation: { type: LlmMeterReservationType.NONE } }),
      };
    }

    const periodStart = ({ period }: { period: LlmTokenLimitPeriod }): Date => {
      const now = new Date();

      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      const date = now.getUTCDate();

      switch (period) {
        case LlmTokenLimitPeriod.HOURLY:
          return new Date(Date.UTC(year, month, date, now.getUTCHours()));
        case LlmTokenLimitPeriod.DAILY:
          return new Date(Date.UTC(year, month, date));
        case LlmTokenLimitPeriod.WEEKLY:
          return new Date(Date.UTC(year, month, date - ((now.getUTCDay() + 6) % 7)));
        case LlmTokenLimitPeriod.MONTHLY:
          return new Date(Date.UTC(year, month, 1));
      }
    };

    const reserved = await LlmUsageLimitService.create({ db }).reserve({
      userId,
      model: envLlmChatModel(),
      from: periodStart({ period: limit.period }),
      limit: limit.tokens,
      reservedTokens,
      expiresInSeconds,
    });

    if (reserved.status === "error") {
      return reserved;
    }

    const { result } = reserved;

    if (result.type === LlmReservationType.LIMIT_REACHED) {
      return {
        status: "error",
        err: new LlmUsageLimitError(
          `You have reached the ${limit.period} usage limit of the assistant.`,
        ),
      };
    }

    return {
      status: "success",
      result: new this({
        db,
        userId,
        reservation: {
          type: LlmMeterReservationType.RESERVED,
          reservation: result.reservation,
        },
      }),
    };
  }

  record({ usage }: { usage: Omit<InsertLlmUsages, "userId"> }): Promise<Result<SelectLlmUsages>> {
    return LlmUsagesService.create({ db: this.#db }).record({
      usage: { ...usage, userId: this.#userId },
    });
  }

  async close(): Promise<Result<void>> {
    if (this.#reservation.type === LlmMeterReservationType.NONE) {
      return { status: "success", result: undefined };
    }

    return await LlmUsageLimitService.create({ db: this.#db }).release({
      userId: this.#userId,
      id: this.#reservation.reservation.id,
    });
  }
}
