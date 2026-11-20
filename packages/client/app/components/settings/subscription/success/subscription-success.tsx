import { startTransition, useEffect, useRef, useState, ViewTransition } from "react";
import { Link, useRevalidator } from "react-router";
import { Check } from "lucide-react";
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

  const activated = subscriptionSummary?.subscription.status === SubscriptionStatus.ACTIVE;

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
    return (
      <SubscriptionStep closeTo={organizationPath} current="done">
        <div className="flex flex-1 flex-col items-center justify-center gap-6 pb-24 text-center">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {i18n.subscription.text.success_ready}
            <Check className="size-4" />
          </h2>

          <Button nativeButton={false} render={<Link to={organizationPath} />}>
            {i18n.subscription.action.continue}
          </Button>
        </div>
      </SubscriptionStep>
    );
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
