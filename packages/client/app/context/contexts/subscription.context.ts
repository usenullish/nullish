import { createContext, useContext } from "react";
import type { Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";

export const SubscriptionContext =
  createContext<Option<Api["SubscriptionSummaries"]["Client"]["SubscriptionSummary"]>>(undefined);

export const useSubscription = () => useContext(SubscriptionContext);
