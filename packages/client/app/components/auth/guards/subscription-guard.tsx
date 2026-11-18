import type { ReactNode } from "react";
import type { Option } from "@usenullish/nullish-common";
import { OrganizationSubscriptionStatus } from "@usenullish/nullish-schema/db";
import type { Api } from "@usenullish/nullish-schema/server";
import { OrganizationLocked } from "~/components/settings/organizations/locked/organization-locked";

export const SubscriptionGuard = ({
  subscriptionSummary,
  children,
}: {
  subscriptionSummary: Option<Api["SubscriptionSummaries"]["Client"]["SubscriptionSummary"]>;
  children: ReactNode;
}) => {
  if (subscriptionSummary?.organization.status === OrganizationSubscriptionStatus.LOCKED) {
    return <OrganizationLocked />;
  }

  return children;
};
