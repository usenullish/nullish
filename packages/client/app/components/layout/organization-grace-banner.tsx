import { TriangleAlert } from "lucide-react";
import { OrganizationSubscriptionStatus } from "@usenullish/nullish-schema/db";
import { useSubscription } from "~/context/contexts/subscription.context";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { useFormatDate } from "~/kit/format/date.hooks";
import { testId } from "~/kit/tests/test.utils";
import { testIds } from "~/kit/tests/test-ids.constants";

export const OrganizationGraceBanner = () => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();
  const subscription = useSubscription();

  if (subscription?.organization.status !== OrganizationSubscriptionStatus.GRACE) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-400"
    >
      <TriangleAlert className="size-4 shrink-0" />
      <p {...testId(testIds.organizations.grace)}>
        {replacePlaceholders(i18n.organizations.text.grace, {
          "{date}": formatDate(subscription.organization.expiresAt),
        })}
      </p>
    </div>
  );
};
