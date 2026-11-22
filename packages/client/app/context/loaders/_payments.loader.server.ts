import { type LoaderFunctionArgs, redirect } from "react-router";
import { isNullish } from "@usenullish/nullish-common";
import { SubscriptionStatus } from "@usenullish/nullish-schema/db";
import { SUBSCRIPTION_DETAILS_PATH } from "@usenullish/nullish-schema/server";
import { SettingsCache } from "~/context/caches/settings.cache";
import { SubscriptionSummariesServer } from "~/context/server/subscription-summaries.server";
import { OrganizationPath, UnscopedPath } from "~/navigation";

export const assertPaymentsEnabled = async ({ params }: LoaderFunctionArgs): Promise<void> => {
  const { settings } = await SettingsCache.getInstance().get();

  if (settings.payments.enabled) {
    return;
  }

  const organizationId = params["org-id"];

  throw redirect(
    isNullish(organizationId)
      ? UnscopedPath.create().toOrganizations()
      : OrganizationPath.create({ organizationId }).to(),
  );
};

export const assertCanCheckout = async (args: LoaderFunctionArgs): Promise<void> => {
  const result = await SubscriptionSummariesServer.create().listAll(args);

  const [summary] = result?.subscriptionSummaries ?? [];

  if (isNullish(summary)) {
    return;
  }

  const {
    subscription: { status, organizationId },
  } = summary;

  if (status === SubscriptionStatus.TRIALING || status === SubscriptionStatus.INACTIVE) {
    return;
  }

  throw redirect(
    OrganizationPath.create({ organizationId }).to({ path: SUBSCRIPTION_DETAILS_PATH }),
  );
};
