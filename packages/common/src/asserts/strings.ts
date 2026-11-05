import * as z from "zod";
import { NotEmptyStringSchema } from "../schemas/string";

export const notEmptyString = (value: string | undefined | null): value is string =>
  NotEmptyStringSchema.validate(value);

export const isEmptyString = (value: string | undefined | null): value is undefined | null | "" =>
  !notEmptyString(value);

export const sanitizeEmptyString = (value: string | undefined | null): string | undefined => {
  return notEmptyString(value?.trim()) ? value.trim() : undefined;
};

export const assertNotEmptyString: (
  value: string | undefined | null,
  name: string,
) => asserts value is z.infer<typeof NotEmptyStringSchema> = (
  value: string | undefined | null,
  name: string,
): void => {
  const valid = NotEmptyStringSchema.validate(value);

  if (!valid) {
    throw new Error(`Missing or empty required field ${name}`);
  }
};
