import { createContext, useContext } from "react";
import { assertNonNullish, type Option } from "@usenullish/nullish-common";
import type { ThemeProviderState } from "~/kit/theme/theme-provider";

export const NonNullishThemeContext = createContext<Option<ThemeProviderState>>(undefined);

export const useTheme = () => {
  const context = useContext(NonNullishThemeContext);
  assertNonNullish(context, "useTheme must be used within a ThemeProvider");
  return context;
};
