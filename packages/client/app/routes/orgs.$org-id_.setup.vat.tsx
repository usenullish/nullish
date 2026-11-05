import type { Route } from "./+types/orgs.$org-id_.setup.vat";
import { useState } from "react";
import { Navigate } from "react-router";
import { isNullish, nonNullish, type Option } from "@usenullish/nullish-common";
import { VatPaymentMethod } from "@usenullish/nullish-schema/db";
import { SetupVat } from "~/components/settings/organizations/setup/setup-vat";
import { SetupStep } from "~/components/settings/organizations/setup/setup-step";
import { setupPath, setupSteps } from "~/components/settings/organizations/setup/setup.hooks";
import { OrganizationsSetupServer } from "~/context/server/organizations+setup.server";
import { useI18n } from "~/kit/i18n/i18n.context";

export const loader = async (args: Route.LoaderArgs) => {
  return await OrganizationsSetupServer.create().load(args);
};

// /orgs/:orgId/setup/vat
const SetupVatPage = ({ loaderData, params }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const [paymentMethod, setPaymentMethod] = useState<Option<VatPaymentMethod>>(undefined);
  const organizationId = params["org-id"];

  if (isNullish(organizationId)) {
    return <Navigate to="/orgs" replace />;
  }

  const ready = setupPath({ organizationId, step: "ready" });

  const next = ({ paymentMethod }: { paymentMethod: Option<VatPaymentMethod> }): string =>
    paymentMethod === VatPaymentMethod.NET_RATE
      ? setupPath({ organizationId, step: "vat-rate" })
      : ready;

  const { period, vatSetting, vatMethod } = loaderData;

  if (nonNullish(vatMethod)) {
    return <Navigate to={next(vatMethod)} replace />;
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
      steps={setupSteps({ paymentMethod })}
      skipTo={ready}
    >
      <SetupVat
        organizationId={organizationId}
        period={period}
        vatSetting={vatSetting}
        onPaymentMethodChange={setPaymentMethod}
        redirectTo={next({ paymentMethod })}
      />
    </SetupStep>
  );
};

export default SetupVatPage;
