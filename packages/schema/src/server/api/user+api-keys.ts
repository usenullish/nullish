import * as z from "zod";
import { TimestampCodec } from "@usenullish/nullish-common";
import { RecordsSchema } from "../../records";
import { AuthSchema } from "../../auth";

export const ApiKeySchema = RecordsSchema.Auth.ApiKeysSchema.SelectApiKeysSchema.pick({
  id: true,
  name: true,
  start: true,
}).extend({
  permissions: AuthSchema.ApiKeysSchema.ApiKeyPermissionsSchema.nullable(),
  expiresAt: TimestampCodec.nullable(),
  lastRequest: TimestampCodec.nullable(),
  createdAt: TimestampCodec,
});

export const ApiKeyParamsSchema = z.strictObject({
  id: ApiKeySchema.shape.id,
});

export const GetApiKeysResponseSchema = z.strictObject({
  apiKeys: z.array(ApiKeySchema),
});

export const CreateApiKeyRequestSchema = z.strictObject({
  name: RecordsSchema.Auth.ApiKeysSchema.SelectApiKeysSchema.shape.name.unwrap().min(1).max(32),
  expiresInDays: z.int().min(1).max(365),
  permissions: AuthSchema.ApiKeysSchema.ApiKeyPermissionsSchema,
});

export const CreateApiKeyResponseSchema = z.strictObject({
  apiKey: ApiKeySchema,
  key: z.string(),
});
