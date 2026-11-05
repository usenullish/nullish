import { createContext } from "react";
import type { Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { useContext } from "react";

export const AccountingSettingsContext =
  createContext<
    Option<Api["AccountingSettings"]["Client"]["GetAccountingSettingsResponse"]["settings"][number]>
  >(undefined);

export const useAccountingSettings = () => useContext(AccountingSettingsContext);
