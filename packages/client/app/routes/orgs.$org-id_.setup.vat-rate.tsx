import type { Route } from "./+types/orgs.$org-id_.setup.vat-rate";
import { Navigate } from "react-router";
import { isNullish, nonNullish } from "@usenullish/nullish-common";
import { VatPaymentMethod } from "@usenullish/nullish-schema/db";
import { NewVatRates } from "~/components/settings/vat/rates/new/new-vat-rates";
import type { VatRateDefaults } from "~/components/settings/vat/rates/form/vat-rate-fields";
import { SetupStep } from "~/components/settings/organizations/setup/setup-step";
import { setupPath, setupSteps } from "~/components/settings/organizations/setup/setup.hooks";
import { OrganizationsSetupServer } from "~/context/server/organizations+setup.server";
import { useI18n } from "~/kit/i18n/i18n.context";

const NET_RATE_TAX_DEFAULTS: VatRateDefaults = {
  code: "UN81",
  rate: 8.1,
  startOn: new Date("2024-01-01"),
};

export const loader = async (args: Route.LoaderArgs) => {
  return await OrganizationsSetupServer.create().load(args);
};

// /orgs/:orgId/setup/vat-rate
const SetupVatRatePage = ({ loaderData, params }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const organizationId = params["org-id"];

  if (isNullish(organizationId)) {
    return <Navigate to="/orgs" replace />;
  }

  const next = setupPath({ organizationId, step: "ready" });

  const paymentMethod = loaderData.vatMethod?.paymentMethod;

  if (nonNullish(loaderData.netRateTax) || paymentMethod !== VatPaymentMethod.NET_RATE) {
    return <Navigate to={next} replace />;
  }

  return (
    <SetupStep
      organizationId={organizationId}
      setup={loaderData}
      title={i18n.vat.action.rate_create}
      current="vat_rate"
      steps={setupSteps({ paymentMethod })}
      skipTo={next}
    >
      <NewVatRates
        organizationId={organizationId}
        redirectTo={next}
        defaults={NET_RATE_TAX_DEFAULTS}
      />
    </SetupStep>
  );
};

export default SetupVatRatePage;
