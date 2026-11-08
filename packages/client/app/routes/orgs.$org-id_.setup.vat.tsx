import type { Route } from "./+types/orgs.$org-id_.setup.vat";
import { Navigate } from "react-router";
import { isNullish, nonNullish } from "@usenullish/nullish-common";
import { SetupVat } from "~/components/settings/organizations/setup/setup-vat";
import { SetupStep } from "~/components/settings/organizations/setup/setup-step";
import { SETUP_STEPS, setupPath } from "~/components/settings/organizations/setup/setup.hooks";
import { OrganizationsSetupServer } from "~/context/server/organizations+setup.server";
import { useI18n } from "~/kit/i18n/i18n.context";

export const loader = async (args: Route.LoaderArgs) => {
  return await OrganizationsSetupServer.create().load(args);
};

// /orgs/:orgId/setup/vat
const SetupVatPage = ({ loaderData, params }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const organizationId = params["org-id"];

  if (isNullish(organizationId)) {
    return <Navigate to="/orgs" replace />;
  }

  const ready = setupPath({ organizationId, step: "ready" });

  const { period, vatSetting, vatMethod } = loaderData;

  if (nonNullish(vatMethod)) {
    return <Navigate to={ready} replace />;
  }

  if (isNullish(period)) {
    return <Navigate to={ready} replace />;
  }

  return (
    <SetupStep
      organizationId={organizationId}
      setup={loaderData}
      title={i18n.vat.action.settings_create}
      current="vat"
      steps={SETUP_STEPS}
      skipTo={ready}
    >
      <SetupVat
        organizationId={organizationId}
        period={period}
        vatSetting={vatSetting}
        redirectTo={ready}
      />
    </SetupStep>
  );
};

export default SetupVatPage;
