import * as pg from "drizzle-orm/pg-core";
import { MeteringSchema } from "./_schema";
import { primaryKey } from "../_common";
import { timestamp } from "../_temporal";
import { authUserIdReference } from "../auth/users";
import { meteringPolicies } from "../_policies";

// The tokens a running chat may still consume, counted with the usages against the limit.
// Deleted when the chat ends, or ignored once expired if the process dies before.
export const LlmReservationsSchema = MeteringSchema.table(
  "llm_reservations",
  {
    id: primaryKey(),
    userId: authUserIdReference(),
    reservedTokens: pg.bigint({ mode: "bigint" }).notNull(),
    expiresAt: timestamp().notNull(),
  },
  (table) => [
    pg.index("llm_reservations_user_expires_at_idx").on(table.userId, table.expiresAt),
    ...meteringPolicies({
      userId: table.userId,
      tableName: "llm_reservations",
    }),
  ],
);
