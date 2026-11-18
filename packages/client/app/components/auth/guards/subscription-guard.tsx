import type { ReactNode } from "react";
import { OrganizationSubscriptionStatus } from "@usenullish/nullish-schema/db";
import { OrganizationLocked } from "~/components/settings/organizations/locked/organization-locked";
import { useSubscriptionSummary } from "~/context/contexts/subscription-summary.context";

export const SubscriptionGuard = ({ children }: { children: ReactNode }) => {
  const subscriptionSummary = useSubscriptionSummary();

  if (subscriptionSummary?.organization.status === OrganizationSubscriptionStatus.LOCKED) {
    return <OrganizationLocked />;
  }

  return children;
};
