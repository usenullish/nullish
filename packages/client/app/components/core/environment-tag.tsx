import { isNullish } from "@usenullish/nullish-common";
import { cn } from "cn";
import { useEnvironment } from "~/kit/environment/environment.context";
import { useI18n } from "~/kit/i18n/i18n.context";
import { Environment } from "~/kit/environment/environment.services";

const COLORS: Record<Environment, string> = {
  [Environment.DEV]: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  [Environment.TEST]: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  [Environment.DEMO]: "bg-violet-500/10 text-violet-700 dark:text-violet-400",
  [Environment.STAGING]: "bg-orange-500/10 text-orange-700 dark:text-orange-400",
};

export const EnvironmentTag = ({ className }: { className?: string }) => {
  const { i18n } = useI18n();
  const environment = useEnvironment();

  if (isNullish(environment)) {
    return null;
  }

  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 px-2 text-xs font-medium whitespace-nowrap",
        COLORS[environment],
        className,
      )}
    >
      {i18n.environment[environment]}
      <span className="size-1.5 rounded-full bg-current" />
    </span>
  );
};
