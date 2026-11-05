import type { Route } from "./+types/orgs.$org-id_.setup.ready";
import { Navigate } from "react-router";
import { isNullish } from "@usenullish/nullish-common";
import { WizardLayout } from "~/components/layout/wizard-layout";
import { NewOrganizationReady } from "~/components/settings/organizations/new/new-organization-ready";
import { useOrganizations } from "~/context/contexts/organizations.context";
import { useI18n } from "~/kit/i18n/i18n.context";

// /orgs/:orgId/setup/ready
const SetupReadyPage = ({ params }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const organizations = useOrganizations();
  const organization = organizations?.find(({ id }) => id === params["org-id"]);

  if (isNullish(organization)) {
    return <Navigate to="/orgs" replace />;
  }

  return (
    <WizardLayout title={i18n.organizations.text.new} closeTo={`/orgs/${organization.id}`}>
      <NewOrganizationReady result={organization} />
    </WizardLayout>
  );
};

export default SetupReadyPage;
