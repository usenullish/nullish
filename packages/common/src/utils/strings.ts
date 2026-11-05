import { isEmptyString } from "../asserts/strings";
import * as z from "zod";

export const emptyStringToNull = <T extends z.ZodType>(schema: T) =>
  z.preprocess(
    (value) => (typeof value === "string" && isEmptyString(value) ? null : value),
    schema,
  );

export const withoutSpaces = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (typeof value === "string" ? value.replace(/\s/g, "") : value), schema);
