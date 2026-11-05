import * as z from "zod";
import { RecordsSchema } from "../../records";

export const SelectChatSchema = z.strictObject({
  conversation: RecordsSchema.Chat.ConversationsSchema.SelectConversationsSchema,
  messages: z.array(RecordsSchema.Chat.MessagesSchema.SelectMessagesSchema),
});
