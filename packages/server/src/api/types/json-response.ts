import * as z from "zod";

/**
 * Workaround for @hono/zod-openapi when using Zod codecs.
 *
 * Hono inspects response schemas using output types (z.output), expecting
 * decoded values (like Date objects) instead of JSON-encoded wire values.
 * Because codecs output decoded types, Hono's route handler rejects valid
 * encoded JSON responses (z.input).
 *
 * This helper casts the schema to treat its encoded input shape as both input
 * and output, allowing Hono to accept serialized codec payloads.
 */
export type ToJsonResponseSchema<T extends z.ZodTypeAny> = z.ZodType<z.input<T>, z.input<T>>;

export function toJsonSchema<T extends z.ZodTypeAny>(schema: T): ToJsonResponseSchema<T> {
  return schema as unknown as ToJsonResponseSchema<T>;
}
