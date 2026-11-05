import { createContext } from "react";
import type { Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { useContext } from "react";

export const BillingSettingsContext =
  createContext<
    Option<Api["BillingSettings"]["Client"]["GetBillingSettingsResponse"]["settings"][number]>
  >(undefined);

export const useBillingSettings = () => useContext(BillingSettingsContext);
