import * as z from "zod";
import { NotEmptyStringSchema } from "./string";
import { toLocalDateString } from "../utils/date";

export const DateSchema = z.strictObject({ __date__: NotEmptyStringSchema });

export const DateCodec = z.codec(DateSchema, z.date(), {
  decode: ({ __date__ }) => new Date(__date__),
  encode: (date) => ({ __date__: toLocalDateString(date) }),
});

// Plain year-month-date string, e.g. for URL search params where the object form cannot be used
export const DateStringCodec = z.codec(z.iso.date(), z.date(), {
  decode: (date) => new Date(date),
  encode: (date) => toLocalDateString(date),
});
