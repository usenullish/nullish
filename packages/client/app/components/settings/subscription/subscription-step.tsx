import { nonNullish } from "@usenullish/nullish-common";
import { WizardLayout } from "~/components/layout/wizard-layout";
import { WizardProgress } from "~/components/layout/wizard-progress";
import { useI18n } from "~/kit/i18n/i18n.context";

const SUBSCRIPTION_STEPS = ["plan", "payment", "done"] as const;

export type SubscriptionStepKey = (typeof SUBSCRIPTION_STEPS)[number];

export const SubscriptionStep = ({
  closeTo,
  current,
  intro,
  children,
}: {
  closeTo: string;
  current: SubscriptionStepKey;
  intro?: string;
  children: React.ReactNode;
}) => {
  const { i18n } = useI18n();

  return (
    <WizardLayout title={i18n.navigation.subscription} closeTo={closeTo}>
      <WizardProgress
        current={current}
        steps={SUBSCRIPTION_STEPS.map((key) => ({ key, label: i18n.subscription.step[key] }))}
      />

      {nonNullish(intro) && <p className="text-xs text-foreground">{intro}</p>}

      {children}
    </WizardLayout>
  );
};
