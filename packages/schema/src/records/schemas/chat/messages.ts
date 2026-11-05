import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import * as z from "zod";
import { MessagesSchema } from "../../../db/schemas/chat/messages";
import { MessageRole } from "../../../db/constants/chat";

export const ToolCallSchema = z.strictObject({
  id: z.string(),
  type: z.literal("function"),
  function: z.strictObject({
    name: z.string(),
    arguments: z.string(),
  }),
});

const refineMessages = {
  role: z.enum(MessageRole),
  toolCalls: z.array(ToolCallSchema).nullish(),
};

export const SelectMessagesSchema = createSelectSchema(MessagesSchema, refineMessages);
export const InsertMessagesSchema = createInsertSchema(MessagesSchema, refineMessages).omit({
  id: true,
  createdAt: true,
  conversationId: true,
  position: true,
});

export const FilterMessagesSchema = z.strictObject({
  positionBefore: SelectMessagesSchema.shape.position.optional(),
  // Only the user and assistant messages with text, i.e. without the tool calls and their results.
  // Useful for the client's chat notably to lazy load only the message which are meant
  // to be displayed.
  textOnly: z.boolean().optional(),
});
