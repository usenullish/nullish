import { isNullish, type Option } from "@usenullish/nullish-common";

export const amountStep = (decimals: Option<number>): number | "any" =>
  isNullish(decimals) ? "any" : 10 ** -decimals;
