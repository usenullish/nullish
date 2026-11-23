import * as z from "zod";
import { PaginationResponseSchema } from "../common/query";
import { RecordsSchema } from "../../records";
import { withAuditFieldsCodecs } from "./_audit";
import { MessageSchema } from "./chat+conversations+messages";

export const ConversationSchema = withAuditFieldsCodecs(
  RecordsSchema.Chat.ConversationsSchema.SelectConversationsSchema,
);

export const GetConversationsResponseSchema = z.strictObject({
  data: z.array(ConversationSchema),
  pagination: PaginationResponseSchema.optional(),
});

export const ChatSchema = z.strictObject({
  conversation: ConversationSchema,
  messages: z.array(MessageSchema),
});

export const GetConversationResponseSchema = z.strictObject({
  chat: ChatSchema.nullish(),
});
