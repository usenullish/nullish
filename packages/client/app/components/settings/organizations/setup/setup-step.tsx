import { Link } from "react-router";
import { nonNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { WizardLayout } from "~/components/layout/wizard-layout";
import { SetupProgress } from "~/components/settings/organizations/setup/setup-progress";
import {
  SETUP_STEPS,
  type SetupStepKey,
  useSetupDone,
} from "~/components/settings/organizations/setup/setup.hooks";
import type { OrganizationSetup } from "~/context/server/organizations+setup.server";
import { useOrganizations } from "~/context/contexts/organizations.context";
import { Button } from "~/ui/components/button";
import { useI18n } from "~/kit/i18n/i18n.context";

export const SetupStep = ({
  organizationId,
  setup,
  title,
  current,
  steps,
  skipTo,
  children,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  setup: OrganizationSetup;
  title: string;
  current: Exclude<SetupStepKey, "organization">;
  steps: SetupStepKey[];
  skipTo: string;
  children: React.ReactNode;
}) => {
  const { i18n } = useI18n();
  const organizations = useOrganizations();

  const done = useSetupDone({
    organization: organizations?.find(({ id }) => id === organizationId),
    setup,
  });

  const previous = SETUP_STEPS[SETUP_STEPS.indexOf(current) - 1];
  const previousDone = nonNullish(previous) ? done[previous] : undefined;

  return (
    <WizardLayout title={title} closeTo={`/orgs/${organizationId}`}>
      <SetupProgress current={current} steps={steps} />

      <p className="text-xs text-foreground">
        {nonNullish(previousDone) && (
          <span className="block text-muted-foreground">{previousDone}</span>
        )}
        <span className="block">{i18n.organizations.setup_next[current]}</span>
      </p>

      {children}

      <div className="mx-auto flex w-full max-w-2xl justify-end">
        <Button variant="ghost" nativeButton={false} render={<Link to={skipTo} />}>
          {i18n.core.action.skip}
        </Button>
      </div>
    </WizardLayout>
  );
};
