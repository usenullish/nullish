import * as pg from "drizzle-orm/pg-core";
import { ChatSchema } from "./_schema";
import { primaryKey } from "../_common";
import { auditFields } from "../_audit";
import { authUserIdReference } from "../auth/users";
import { organizationIdReferenceOptional } from "../core/organizations";
import { chatConversationPolicies } from "../_policies";

export const ConversationsSchema = ChatSchema.table(
  "conversations",
  {
    id: primaryKey(),
    userId: authUserIdReference(),
    organizationId: organizationIdReferenceOptional({ onDelete: "cascade" }),
    title: pg.text(),
    ...auditFields(),
  },
  (table) => [
    pg.index("conversations_user_updated_at_idx").on(table.userId, table.updatedAt),
    ...chatConversationPolicies({
      userId: table.userId,
      organizationId: table.organizationId,
    }),
  ],
);

export const conversationIdReferenceOptional = ({
  onDelete,
}: {
  onDelete?: "cascade" | "set null";
} = {}) => pg.uuid().references(() => ConversationsSchema.id, { onDelete });

export const conversationIdReference = () =>
  pg
    .uuid()
    .references(() => ConversationsSchema.id, { onDelete: "cascade" })
    .notNull();
