import { createContext } from "react";
import type { Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { useContext } from "react";

export const CurrenciesContext =
  createContext<Option<Api["Currencies"]["Client"]["GetCurrenciesResponse"]["currencies"]>>(
    undefined,
  );

export const useCurrencies = () => useContext(CurrenciesContext);
