import type { Route } from "./+types/orgs.$org-id_.subscription.plans";
import { Navigate, redirect } from "react-router";
import { isNullish } from "@usenullish/nullish-common";
import { SubscriptionStep } from "~/components/settings/subscription/subscription-step";
import { SubscriptionPlans } from "~/components/settings/subscription/plans/subscription-plans";
import { useOrganizations } from "~/context/contexts/organizations.context";
import { NonNullishOrganizationContext } from "~/context/contexts/organization.context";
import { ExternalPlansServer } from "~/context/server/subscription+external-plans.server";
import { CustomPlansServer } from "~/context/server/subscription+custom-plans.server";
import { SettingsCache } from "~/context/caches/settings.cache";
import { OrganizationPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const loader = async (args: Route.LoaderArgs) => {
  const { settings } = await SettingsCache.getInstance().get();

  if (!settings.payments.enabled) {
    const organizationId = args.params["org-id"];

    throw redirect(
      isNullish(organizationId) ? "/orgs" : OrganizationPath.create({ organizationId }).to(),
    );
  }

  const [externalPlans, customPlans] = await Promise.all([
    ExternalPlansServer.create().get(args),
    CustomPlansServer.create().get(args),
  ]);

  return { externalPlans, customPlans };
};

// /orgs/:orgId/subscription/plans
// Outside the organization layout, so that the admins of a locked organization can pick a plan.
const SubscriptionPlansPage = ({ params, loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const organizations = useOrganizations();
  const organization = organizations?.find(({ id }) => id === params["org-id"]);

  if (isNullish(organization)) {
    return <Navigate to="/orgs" replace />;
  }

  return (
    <NonNullishOrganizationContext.Provider value={organization}>
      <SubscriptionStep
        closeTo={OrganizationPath.create({ organizationId: organization.id }).to()}
        current="plan"
        intro={replacePlaceholders(i18n.subscription.text.plans_description, {
          "{name}": organization.name,
        })}
      >
        <SubscriptionPlans
          plans={loaderData.externalPlans?.externalPlans ?? []}
          customPlans={loaderData.customPlans?.customPlans ?? []}
        />
      </SubscriptionStep>
    </NonNullishOrganizationContext.Provider>
  );
};

export default SubscriptionPlansPage;
