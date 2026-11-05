import { createContext, useContext } from "react";
import { assertNonNullish, type Option } from "@usenullish/nullish-common";
import type { PrivacyProviderState } from "~/kit/privacy/privacy-provider";

export const NonNullishPrivacyContext = createContext<Option<PrivacyProviderState>>(undefined);

export const usePrivacy = () => {
  const context = useContext(NonNullishPrivacyContext);
  assertNonNullish(context, "usePrivacy must be used within a PrivacyProvider");
  return context;
};
