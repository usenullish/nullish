import * as pg from "drizzle-orm/pg-core";
import { ChatSchema } from "./_schema";
import { primaryKey } from "../_common";
import { timestampNow } from "../_temporal";
import { ConversationsSchema, conversationIdReference } from "./conversations";
import { chatMessagesPolicies } from "../_policies";
import { MessageRole } from "../../constants/chat";

export const messageRole = ChatSchema.enum("message_role", MessageRole);

export const MessagesSchema = ChatSchema.table(
  "messages",
  {
    id: primaryKey(),
    conversationId: conversationIdReference(),
    position: pg.integer().notNull(),
    role: messageRole().notNull(),
    content: pg.text(),
    toolCalls: pg.jsonb(),
    toolCallId: pg.text(),
    createdAt: timestampNow(),
  },
  (table) => [
    pg.uniqueIndex("messages_conversation_position_uidx").on(table.conversationId, table.position),
    ...chatMessagesPolicies({
      joinedColumnId: table.conversationId,
      joinedTable: ConversationsSchema,
    }),
  ],
);
