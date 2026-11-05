import { createContext } from "react";
import type { Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { useContext } from "react";

export const AccountsContext =
  createContext<Option<Api["Accounts"]["Client"]["GetAccountsResponse"]["accounts"]>>(undefined);

export const useAccounts = () => useContext(AccountsContext);
