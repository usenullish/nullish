import type { Route } from "./+types/orgs.$org-id_.subscription.success";
import { Navigate } from "react-router";
import { isNullish } from "@usenullish/nullish-common";
import { SubscriptionSuccess } from "~/components/settings/subscription/success/subscription-success";
import { useOrganizations } from "~/context/contexts/organizations.context";
import { NonNullishOrganizationContext } from "~/context/contexts/organization.context";
import { SubscriptionSummariesServer } from "~/context/server/subscription-summaries.server";
import { UnscopedPath } from "~/navigation";

export const loader = async (args: Route.LoaderArgs) => {
  return await SubscriptionSummariesServer.create().listAll(args);
};

// /orgs/:orgId/subscription/success
// Stripe redirects here before the webhook updates the subscription, so the page waits for it.
const SubscriptionSuccessPage = ({ params, loaderData }: Route.ComponentProps) => {
  const organizations = useOrganizations();
  const organization = organizations?.find(({ id }) => id === params["org-id"]);

  if (isNullish(organization)) {
    return <Navigate to={UnscopedPath.create().toOrganizations()} replace />;
  }

  const [subscriptionSummary] = loaderData?.subscriptionSummaries ?? [];

  return (
    <NonNullishOrganizationContext.Provider value={organization}>
      <SubscriptionSuccess subscriptionSummary={subscriptionSummary} />
    </NonNullishOrganizationContext.Provider>
  );
};

export default SubscriptionSuccessPage;
