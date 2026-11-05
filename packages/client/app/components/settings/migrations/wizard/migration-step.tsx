import { nonNullish } from "@usenullish/nullish-common";
import { WizardLayout } from "~/components/layout/wizard-layout";
import { WizardProgress } from "~/components/layout/wizard-progress";
import { useI18n } from "~/kit/i18n/i18n.context";

const MIGRATION_STEPS = ["source", "files", "processing", "result"] as const;

export type MigrationStepKey = (typeof MIGRATION_STEPS)[number];

export const MigrationStep = ({
  title,
  closeTo,
  current,
  intro,
  children,
}: {
  title: string;
  closeTo: string;
  current: MigrationStepKey;
  intro?: string;
  children: React.ReactNode;
}) => {
  const { i18n } = useI18n();

  return (
    <WizardLayout title={title} closeTo={closeTo}>
      <WizardProgress
        current={current}
        steps={MIGRATION_STEPS.map((key) => ({ key, label: i18n.migrations.step[key] }))}
      />

      {nonNullish(intro) && <p className="text-xs text-foreground">{intro}</p>}

      {children}
    </WizardLayout>
  );
};
