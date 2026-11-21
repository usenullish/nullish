import { isNullish, nonNullish } from "@usenullish/nullish-common";
import { SubscriptionStatus } from "@usenullish/nullish-schema/db";
import { useSubscriptionSummary } from "~/context/contexts/subscription-summary.context";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { Card, CardDescription, CardHeader, CardTitle } from "~/ui/components/card";

export const SubscriptionOverview = () => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();
  const subscriptionSummary = useSubscriptionSummary();

  if (isNullish(subscriptionSummary)) {
    return null;
  }

  const {
    subscription: { status, periodEnd },
  } = subscriptionSummary;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{i18n.subscription.status[status]}</CardTitle>
        {nonNullish(periodEnd) && (
          <CardDescription>
            {replacePlaceholders(
              status === SubscriptionStatus.TRIALING
                ? i18n.subscription.text.trial_ends
                : i18n.subscription.text.period_ends,
              { "{date}": formatDate(periodEnd) },
            )}
          </CardDescription>
        )}
      </CardHeader>
    </Card>
  );
};
