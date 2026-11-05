import { createContext, useContext } from "react";
import { assertNonNullish, type Option } from "@usenullish/nullish-common";
import type { I18nProviderState } from "~/kit/i18n/i18n-provider";

export const NonNullishI18nContext = createContext<Option<I18nProviderState>>(undefined);

export const useI18n = () => {
  const context = useContext(NonNullishI18nContext);
  assertNonNullish(context, "useI18n must be used within a I18nProvider");
  return context;
};
