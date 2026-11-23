import type { ReactNode } from "react";
import { OrganizationSubscriptionStatus } from "@usenullish/nullish-schema/db";
import { OrganizationLocked } from "~/components/settings/organizations/locked/organization-locked";
import { useSubscription } from "~/context/contexts/subscription.context";

export const SubscriptionGuard = ({ children }: { children: ReactNode }) => {
  const subscription = useSubscription();

  if (subscription?.organization.status === OrganizationSubscriptionStatus.LOCKED) {
    return <OrganizationLocked />;
  }

  return children;
};
