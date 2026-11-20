import { startTransition, useEffect, useRef, useState, ViewTransition } from "react";
import { Link, Navigate, useRevalidator } from "react-router";
import type { Option } from "@usenullish/nullish-common";
import { SubscriptionStatus } from "@usenullish/nullish-schema/db";
import type { Api } from "@usenullish/nullish-schema/server";
import { SubscriptionStep } from "~/components/settings/subscription/subscription-step";
import { useOrganization } from "~/context/contexts/organization.context";
import { useI18n } from "~/kit/i18n/i18n.context";
import { OrganizationPath } from "~/navigation";
import { Button } from "~/ui/components/button";
import { TextShimmerLoader } from "~/ui/components/loader";

type SubscriptionSummary = Api["SubscriptionSummaries"]["Client"]["SubscriptionSummary"];

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 30;

const ACTIVATED_STATUSES: SubscriptionStatus[] = [
  SubscriptionStatus.ACTIVE,
  SubscriptionStatus.TRIALING,
];

export const SubscriptionSuccess = ({
  subscriptionSummary,
}: {
  subscriptionSummary: Option<SubscriptionSummary>;
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const { revalidate } = useRevalidator();

  const [timedOut, setTimedOut] = useState(false);
  const timeout = useRef<Option<ReturnType<typeof setTimeout>>>(undefined);
  const attempts = useRef(0);

  const activated =
    subscriptionSummary !== undefined &&
    ACTIVATED_STATUSES.includes(subscriptionSummary.subscription.status);

  useEffect(() => {
    if (activated) {
      return;
    }

    if (attempts.current >= POLL_MAX_ATTEMPTS) {
      startTransition(() => setTimedOut(true));
      return;
    }

    timeout.current = setTimeout(() => {
      attempts.current += 1;
      void revalidate();
    }, POLL_INTERVAL_MS);

    return () => clearTimeout(timeout.current);
  }, [activated, subscriptionSummary, revalidate]);

  const organizationPath = OrganizationPath.create({ organizationId: organization.id }).to();

  if (activated) {
    return <Navigate to={organizationPath} replace />;
  }

  return (
    <SubscriptionStep
      closeTo={organizationPath}
      current="done"
      intro={i18n.subscription.text.success_description}
    >
      {timedOut ? (
        <ViewTransition>
          <div className="flex flex-col items-start gap-4">
            <p className="text-xs text-muted-foreground">
              {i18n.subscription.text.success_timeout}
            </p>

            <Button nativeButton={false} render={<Link to={organizationPath} />}>
              {i18n.subscription.action.back_to_organization}
            </Button>
          </div>
        </ViewTransition>
      ) : (
        <div className="flex justify-center">
          <TextShimmerLoader text={i18n.subscription.state.activating} size="sm" />
        </div>
      )}
    </SubscriptionStep>
  );
};
