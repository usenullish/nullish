import * as z from "zod";
import { NotEmptyStringSchema } from "./string";

export const TimestampSchema = z.strictObject({ __timestamp__: NotEmptyStringSchema });

export const TimestampCodec = z.codec(TimestampSchema, z.date(), {
  decode: ({ __timestamp__ }) => new Date(__timestamp__),
  encode: (date) => ({ __timestamp__: date.toISOString() }),
});
