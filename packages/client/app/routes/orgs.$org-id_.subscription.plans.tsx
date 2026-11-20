import type { Route } from "./+types/orgs.$org-id_.subscription.plans";
import { Navigate } from "react-router";
import { isNullish } from "@usenullish/nullish-common";
import { SubscriptionStep } from "~/components/settings/subscription/subscription-step";
import { SubscriptionPlans } from "~/components/settings/subscription/plans/subscription-plans";
import { useOrganizations } from "~/context/contexts/organizations.context";
import { NonNullishOrganizationContext } from "~/context/contexts/organization.context";
import { PaymentsPlansServer } from "~/context/server/payments+plans.server";
import { OrganizationPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const loader = async (args: Route.LoaderArgs) => {
  return await PaymentsPlansServer.create().get(args);
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
        <SubscriptionPlans plans={loaderData?.plans ?? []} />
      </SubscriptionStep>
    </NonNullishOrganizationContext.Provider>
  );
};

export default SubscriptionPlansPage;
