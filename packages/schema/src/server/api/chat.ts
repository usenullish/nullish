import * as z from "zod";
import { BigIntCodec, NotEmptyStringSchema } from "@usenullish/nullish-common";
import { OrganizationSchema } from "./organizations";
import { RecordsSchema } from "../../records";

export const ChatMessageSchema = z.strictObject({
  role: z.enum(["user", "assistant"]),
  content: NotEmptyStringSchema,
});

export const ChatDomainSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("unscoped") }),
  z.strictObject({ type: z.literal("organization"), organizationId: OrganizationSchema.shape.id }),
]);

const ConversationIdSchema =
  RecordsSchema.Chat.ConversationsSchema.SelectConversationsSchema.shape.id;

export const ChatRequestSchema = z.strictObject({
  domain: ChatDomainSchema,
  conversationId: ConversationIdSchema.optional(),
  message: ChatMessageSchema.shape.content,
});

export const ChatEventSchema = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("conversation"), conversationId: ConversationIdSchema }),
  z.strictObject({ type: z.literal("text"), delta: z.string() }),
  z.strictObject({ type: z.literal("tool_call"), name: z.string() }),
  z.strictObject({ type: z.literal("tool_result"), name: z.string() }),
  z.strictObject({ type: z.literal("tool_error"), name: z.string(), message: z.string() }),
  z.strictObject({
    type: z.literal("usage"),
    model: RecordsSchema.Metering.LlmUsagesSchema.SelectLlmUsagesSchema.shape.model,
    inputTokens: BigIntCodec,
    outputTokens: BigIntCodec,
  }),
  z.strictObject({ type: z.literal("error"), message: z.string() }),
  z.strictObject({ type: z.literal("done") }),
]);
