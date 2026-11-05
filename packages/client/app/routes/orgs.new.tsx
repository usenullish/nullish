import { NewOrganization } from "~/components/settings/organizations/new/new-organization";
import { WizardLayout } from "~/components/layout/wizard-layout";
import { useI18n } from "~/kit/i18n/i18n.context";
import { SetupProgress } from "~/components/settings/organizations/setup/setup-progress";
import { setupSteps } from "~/components/settings/organizations/setup/setup.hooks";

export const OrgsNewPage = () => {
  const { i18n } = useI18n();

  return (
    <WizardLayout title={i18n.organizations.text.new} closeTo="/orgs">
      <SetupProgress current="organization" steps={setupSteps({ paymentMethod: undefined })} />

      <p className="text-xs text-foreground">{i18n.organizations.text.intro}</p>

      <NewOrganization />
    </WizardLayout>
  );
};

export default OrgsNewPage;
