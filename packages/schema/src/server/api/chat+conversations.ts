import * as z from "zod";
import { RecordsSchema } from "../../records";
import { withAuditFieldsCodecs } from "./_audit";
import { MessageSchema } from "./chat+conversations+messages";

export const ConversationSchema = withAuditFieldsCodecs(
  RecordsSchema.Chat.ConversationsSchema.SelectConversationsSchema,
);

export const GetConversationsResponseSchema = z.strictObject({
  conversations: z.array(ConversationSchema),
});

export const ChatSchema = z.strictObject({
  conversation: ConversationSchema,
  messages: z.array(MessageSchema),
});

export const GetConversationResponseSchema = z.strictObject({
  chat: ChatSchema.nullish(),
});
