import { Moon, Sun } from "lucide-react";
import { useTheme } from "~/kit/theme/theme.context";
import { Button } from "~/ui/components/button";
import { useI18n } from "~/kit/i18n/i18n.context";

export const ThemeToggle = () => {
  const { i18n } = useI18n();
  const { setTheme } = useTheme();

  const toggle = () =>
    setTheme(document.documentElement.classList.contains("dark") ? "light" : "dark");

  return (
    <Button variant="ghost" size="icon" aria-label={i18n.core.action.toggle_theme} onClick={toggle}>
      <Sun className="dark:hidden" />
      <Moon className="hidden dark:block" />
    </Button>
  );
};
