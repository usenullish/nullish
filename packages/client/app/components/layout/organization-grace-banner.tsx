import { TriangleAlert } from "lucide-react";
import { OrganizationSubscriptionStatus } from "@usenullish/nullish-schema/db";
import { useSubscriptionSummary } from "~/context/contexts/subscription-summary.context";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { useFormatDate } from "~/kit/format/date.hooks";

export const OrganizationGraceBanner = () => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();
  const subscriptionSummary = useSubscriptionSummary();

  if (subscriptionSummary?.organization.status !== OrganizationSubscriptionStatus.GRACE) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-400"
    >
      <TriangleAlert className="size-4 shrink-0" />
      <p>
        {replacePlaceholders(i18n.organizations.text.grace, {
          "{date}": formatDate(subscriptionSummary.organization.expiresAt),
        })}
      </p>
    </div>
  );
};
