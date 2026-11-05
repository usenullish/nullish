import * as pg from "drizzle-orm/pg-core";
import { MeteringSchema } from "./_schema";
import { primaryKey } from "../_common";
import { timestampNow } from "../_temporal";
import { authUserIdReferenceOptional } from "../auth/users";
import { organizationIdReferenceOptional } from "../core/organizations";
import { meteringPolicies } from "../_policies";
import { conversationIdReferenceOptional } from "../chat/conversations";

// The usages record how many tokens were consumed, not who said what. We keep the usages for
// anonymous statistics: when their user, organization or conversation is deleted,
// only the link to it is cleared.
const onDelete = { onDelete: "set null" } as const;

export const LlmUsagesSchema = MeteringSchema.table(
  "llm_usages",
  {
    id: primaryKey(),
    userId: authUserIdReferenceOptional(onDelete),
    organizationId: organizationIdReferenceOptional(onDelete),
    conversationId: conversationIdReferenceOptional(onDelete),
    model: pg.text().notNull(),
    inputTokens: pg.bigint({ mode: "bigint" }).notNull(),
    outputTokens: pg.bigint({ mode: "bigint" }).notNull(),
    loggedAt: timestampNow(),
  },
  (table) => [
    pg.index("llm_usages_user_logged_at_idx").on(table.userId, table.loggedAt),
    ...meteringPolicies({
      userId: table.userId,
      tableName: "llm_usages",
    }),
  ],
);
