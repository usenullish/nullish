import * as z from "zod";

export const StorageKeySchema = z.string().min(1, "Storage key cannot be empty");

const ReadableStreamSchema = z.custom<ReadableStream<Uint8Array>>(
  (val) => val instanceof ReadableStream,
  { message: "Must be a ReadableStream of Uint8Array" },
);

export const StoragePutArgsSchema = z.strictObject({
  key: StorageKeySchema,
  body: z.union([z.instanceof(Uint8Array), z.instanceof(Blob), ReadableStreamSchema]),
});

export const StorageGetArgsSchema = z.object({
  key: StorageKeySchema,
});

export const StorageGetResultSchema = z.object({
  stream: ReadableStreamSchema,
  contentType: z.string().optional(),
});

export const StorageDeleteArgsSchema = z.strictObject({
  path: StorageKeySchema,
  modifiedBefore: z.date(),
});
