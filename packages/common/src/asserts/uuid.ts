import { notEmptyString } from "./strings";
import * as z from "zod";

export const isValidUuid = (value: string | undefined | null): value is string => {
  return notEmptyString(value) && z.uuid().validate(value);
};

export const isInvalidUuid = (value: string | undefined | null): value is undefined | null | "" =>
  !isValidUuid(value);
