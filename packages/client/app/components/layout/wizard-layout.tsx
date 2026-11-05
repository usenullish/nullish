import { useEffect } from "react";
import { Link, useNavigate } from "react-router";
import { X } from "lucide-react";
import { nonNullish } from "@usenullish/nullish-common";
import { Button } from "~/ui/components/button";
import { Separator } from "~/ui/components/separator";
import { ThemeToggle } from "~/components/core/theme-toggle";
import { EnvironmentTag } from "~/components/core/environment-tag";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const WizardLayout = ({
  title,
  closeTo,
  step,
  children,
}: {
  title: string;
  closeTo: string;
  step?: { current: number; total: number };
  children: React.ReactNode;
}) => {
  const { i18n } = useI18n();
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = ({ key }: KeyboardEvent) => {
      if (key === "Escape") {
        navigate(closeTo);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, closeTo]);

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
        <Button
          variant="ghost"
          size="icon"
          aria-label={i18n.core.action.close}
          className="-ml-1"
          nativeButton={false}
          render={<Link to={closeTo} />}
        >
          <X />
        </Button>
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-xs font-medium">{title}</h1>

        <div className="ml-auto flex items-center gap-2">
          {nonNullish(step) && (
            <span className="text-xs text-muted-foreground">
              {replacePlaceholders(i18n.core.label.step, {
                "{current}": `${step.current}`,
                "{total}": `${step.total}`,
              })}
            </span>
          )}
          <EnvironmentTag />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
        {children}
      </main>
    </div>
  );
};
