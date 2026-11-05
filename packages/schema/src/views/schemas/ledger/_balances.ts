import { refineCurrencyValue } from "../../../db/_refine";

export const refineBalances = {
  totalDebit: refineCurrencyValue,
  totalCredit: refineCurrencyValue,
  balance: refineCurrencyValue,
};
