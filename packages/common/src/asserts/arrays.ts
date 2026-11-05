import * as z from "zod";

const isArrayOfMinLength = <T>({
  items,
  length: { min },
}: {
  items: T[];
  length: { min: number };
}): boolean => z.array(z.unknown()).min(min).validate(items);

const isArrayOfLength = <T>({
  items,
  length: { min, max },
}: {
  items: T[];
  length: { min: number; max: number };
}): boolean => z.array(z.unknown()).min(min).max(max).validate(items);

const notArrayOfMinLength = <T>(args: { items: T[]; length: { min: number } }): boolean =>
  !isArrayOfMinLength(args);

const notArrayOfLength = <T>(args: { items: T[]; length: { min: number; max: number } }): boolean =>
  !isArrayOfLength(args);

export const isArrayExactlyOne = <T>(items: T[]): items is [T] =>
  isArrayOfLength({ items, length: { min: 1, max: 1 } });

export const isArrayAtLeastOne = <T>(items: T[]): items is [T, ...T[]] =>
  isArrayOfMinLength({ items, length: { min: 1 } });

export const isArrayEmpty = <T>(items: T[]): items is [] =>
  isArrayOfLength({ items, length: { min: 0, max: 0 } });

export class InvalidArrayLengthError extends Error {}

export const assertArrayAtMostOne: <T>(
  items: T[],
  message?: string,
) => asserts items is [T] | [] = (items, message) => {
  if (notArrayOfLength({ items, length: { min: 0, max: 1 } })) {
    throw new InvalidArrayLengthError(message);
  }
};

export const assertArrayExactlyOne: <T>(items: T[], message?: string) => asserts items is [T] = (
  items,
  message,
) => {
  if (notArrayOfLength({ items, length: { min: 1, max: 1 } })) {
    throw new InvalidArrayLengthError(message);
  }
};

export const assertArrayAtLeastOne: <T>(
  items: T[],
  message?: string,
) => asserts items is [T, ...T[]] = (items, message) => {
  if (notArrayOfMinLength({ items, length: { min: 1 } })) {
    throw new InvalidArrayLengthError(message);
  }
};

export const assertArrayEmpty: <T>(items: T[], message?: string) => asserts items is [] = (
  items,
  message,
) => {
  if (notArrayOfLength({ items, length: { min: 0, max: 0 } })) {
    throw new InvalidArrayLengthError(message);
  }
};
