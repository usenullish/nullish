import {
  assertNotEmptyString,
  isEmptyString,
  notEmptyString,
  type Option,
} from "@usenullish/nullish-common";
import * as z from "zod";

export const envLlmEnabled = (): boolean =>
  [
    process.env.NULLISH_LLM_URL,
    process.env.NULLISH_LLM_CHAT_MODEL,
    process.env.NULLISH_LLM_API_KEY,
  ].every(notEmptyString);

export const envLlmUrl = (): string => {
  const baseUrl = process.env.NULLISH_LLM_URL;
  assertNotEmptyString(baseUrl, "A base URL for the LLM must be defined.");
  return baseUrl;
};

export const envLlmChatModel = (): string => {
  const model = process.env.NULLISH_LLM_CHAT_MODEL;
  assertNotEmptyString(model, "A model for the LLM chat must be defined.");
  return model;
};

export const envLlmApiKey = (): string => {
  const apiKey = process.env.NULLISH_LLM_API_KEY;
  assertNotEmptyString(apiKey, "An api key for the LLM must be defined.");
  return apiKey;
};

export enum LlmTokenLimitPeriod {
  HOURLY = "hourly",
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

const LlmTokenLimitSchema = z.strictObject({
  tokens: z.coerce.bigint().positive(),
  period: z.enum(LlmTokenLimitPeriod).default(LlmTokenLimitPeriod.WEEKLY),
});

type LlmTokenLimit = z.infer<typeof LlmTokenLimitSchema>;

export const envLlmChatTokenLimit = (): Option<LlmTokenLimit> => {
  const tokens = process.env.NULLISH_LLM_CHAT_TOKEN_LIMIT;

  if (isEmptyString(tokens)) {
    return undefined;
  }

  const period = process.env.NULLISH_LLM_CHAT_TOKEN_LIMIT_PERIOD;

  return LlmTokenLimitSchema.parse({
    tokens,
    period: isEmptyString(period) ? undefined : period,
  });
};
