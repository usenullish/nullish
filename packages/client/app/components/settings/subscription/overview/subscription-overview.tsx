import { Link } from "react-router";
import { isNullish, nonNullish } from "@usenullish/nullish-common";
import { SubscriptionProvider, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import { SUBSCRIPTION_PLANS_PATH } from "@usenullish/nullish-schema/server";
import { useSubscriptionSummary } from "~/context/contexts/subscription-summary.context";
import { useOrganization } from "~/context/contexts/organization.context";
import { useIsOrganizationAdmin } from "~/context/hooks/memberships.hooks";
import { OrganizationPath } from "~/navigation";
import { Button } from "~/ui/components/button";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { Badge } from "~/ui/components/badge";
import { ManageSubscription } from "./manage-subscription";

export const SubscriptionOverview = () => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();
  const subscriptionSummary = useSubscriptionSummary();
  const organization = useOrganization();
  const admin = useIsOrganizationAdmin({ organizationId: organization.id });

  if (isNullish(subscriptionSummary)) {
    return null;
  }

  const {
    subscription: { status, periodEnd },
    plan,
    product,
  } = subscriptionSummary;

  const rows = [
    {
      label: i18n.subscription.label.plan,
      value: product?.name,
    },
    {
      label: i18n.subscription.label.status,
      value: <Badge variant="outline">{i18n.subscription.status[status]}</Badge>,
    },
    {
      label:
        status === SubscriptionStatus.TRIALING
          ? i18n.subscription.label.trial_ends
          : i18n.subscription.label.period_ends,
      value: nonNullish(periodEnd) ? formatDate(periodEnd) : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-xs">
        {rows
          .filter(({ value }) => nonNullish(value))
          .map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>

      {admin && plan.provider === SubscriptionProvider.SELF && (
        <Button
          className="self-start"
          nativeButton={false}
          render={
            <Link
              to={OrganizationPath.create({ organizationId: organization.id }).to({
                path: SUBSCRIPTION_PLANS_PATH,
              })}
            />
          }
        >
          {i18n.organizations.action.choose_plan}
        </Button>
      )}

      {admin && plan.provider !== SubscriptionProvider.SELF && <ManageSubscription />}
    </div>
  );
};
