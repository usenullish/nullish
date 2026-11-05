import { useEffect, useState } from "react";
import { NonNullishThemeContext } from "~/kit/theme/theme.context";
import { applyTheme, saveTheme, type Theme, watchSystemTheme } from "~/kit/theme/theme.services";

export interface ThemeProviderState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const ThemeProvider = ({
  children,
  initialTheme,
}: {
  children: React.ReactNode;
  initialTheme: Theme;
}) => {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    applyTheme({ theme });

    if (theme !== "system") {
      return;
    }

    return watchSystemTheme();
  }, [theme]);

  const value: ThemeProviderState = {
    theme,
    setTheme: (theme: Theme) => {
      void saveTheme({ theme });
      setTheme(theme);
    },
  };

  return (
    <NonNullishThemeContext.Provider value={value}>{children}</NonNullishThemeContext.Provider>
  );
};
