import { type SetupStepKey } from "~/components/settings/organizations/setup/setup.hooks";
import { WizardProgress } from "~/components/layout/wizard-progress";
import { useI18n } from "~/kit/i18n/i18n.context";

export const SetupProgress = ({
  current,
  steps,
}: {
  current?: SetupStepKey;
  steps: readonly SetupStepKey[];
}) => {
  const { i18n } = useI18n();

  return (
    <WizardProgress
      current={current}
      steps={steps.map((key) => ({ key, label: i18n.organizations.setup[key] }))}
    />
  );
};
