import * as z from "zod";
import { TimestampCodec } from "@usenullish/nullish-common";
import { RecordsSchema } from "../../records";

export const MessageSchema = RecordsSchema.Chat.MessagesSchema.SelectMessagesSchema.extend({
  createdAt: TimestampCodec,
});

export const GetMessagesResponseSchema = z.strictObject({
  messages: z.array(MessageSchema),
});

export const GetMessagesFiltersSchema = RecordsSchema.Chat.MessagesSchema.FilterMessagesSchema;
export const GetMessagesFiltersQuerySchema = GetMessagesFiltersSchema.extend({
  positionBefore: z.coerce.number().int().optional(),
  textOnly: z.stringbool().optional(),
});
