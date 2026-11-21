import type { Route } from "./+types/orgs.$org-id.subscription";
import { SettingsTabs } from "~/components/settings/tabs/settings-tabs";
import { assertPaymentsEnabled } from "~/context/loaders/_payments.loader.server";
import { SUBSCRIPTION_TABS } from "~/navigation";

export const loader = async (args: Route.LoaderArgs) => {
  await assertPaymentsEnabled(args);

  return null;
};

const SubscriptionLayout = () => <SettingsTabs tabs={SUBSCRIPTION_TABS} />;

export default SubscriptionLayout;
