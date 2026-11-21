import type { Route } from "./+types/orgs.$org-id.subscription._index";
import { SubscriptionOverview } from "~/components/settings/subscription/overview/subscription-overview";
import { assertPaymentsEnabled } from "~/context/loaders/_payments.loader.server";

export const loader = async (args: Route.LoaderArgs) => {
  await assertPaymentsEnabled(args);

  return null;
};

const SubscriptionPage = () => <SubscriptionOverview />;

export default SubscriptionPage;
