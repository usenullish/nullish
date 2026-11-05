import * as z from "zod";

// Encodes a value with the codecs of its schema (e.g. a Date to { __date__ }, a bigint to
// { __bigint__ }) so that it can go through JSON, which has no dates or bigints. Used before
// sending a body or saving to a jsonb column.
//
// Note: not strictly reserved to the codecs but, mostly used to make their usages explicit when
// transformed.
export const encodeWithCodecs = <T extends z.ZodType>({
  schema,
  value,
}: {
  schema: T;
  value: z.output<T>;
}): z.input<T> => z.encode(schema, value);

// The reverse of encodeWithCodecs: validates a value read from JSON (a body, a jsonb column)
// and decodes it with the codecs of its schema, e.g. { __date__ } back to a Date.
export const decodeWithCodecs = <T extends z.ZodType>({
  schema,
  value,
}: {
  schema: T;
  value: z.input<T>;
}): z.output<T> => z.decode(schema, value);
