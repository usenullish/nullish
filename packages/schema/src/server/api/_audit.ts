import { TimestampCodec } from "@usenullish/nullish-common";
import * as z from "zod";

export const withAuditFieldsCodecs = <T extends z.ZodRawShape>(schema: z.ZodObject<T>) =>
  schema.extend({
    createdAt: TimestampCodec,
    updatedAt: TimestampCodec,
  });
