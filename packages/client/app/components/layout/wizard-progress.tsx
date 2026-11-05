import { isNullish } from "@usenullish/nullish-common";
import { cn } from "cn";

export interface WizardProgressStep<Key extends string> {
  key: Key;
  label: string;
}

export const WizardProgress = <Key extends string>({
  current,
  steps,
}: {
  current?: Key;
  steps: WizardProgressStep<Key>[];
}) => {
  const currentIndex = isNullish(current)
    ? steps.length
    : steps.findIndex(({ key }) => key === current);

  return (
    <ol className="mx-auto mb-10 flex w-fit items-start text-xs">
      {steps.map(({ key, label }, i) => {
        const completed = i < currentIndex;
        const justCompleted = i === currentIndex - 1;
        const active = i === currentIndex;
        const last = i === steps.length - 1;

        return (
          <li
            key={key}
            aria-current={active ? "step" : undefined}
            className={cn("flex flex-col gap-2", !last && "w-16 sm:w-32")}
          >
            <div className="flex items-center">
              <span
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center border tabular-nums",
                  completed && "border-primary-soft bg-primary-soft text-primary-soft-foreground",
                  justCompleted && "animate-in duration-500 zoom-in-50",
                  active && !completed && "border-primary font-medium",
                  !active && !completed && "text-muted-foreground",
                )}
              >
                {i + 1}
              </span>

              {!last && <span className="h-px flex-1 bg-border" />}
            </div>

            <span
              className={cn(
                "sr-only sm:not-sr-only",
                active ? "font-medium" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
};
