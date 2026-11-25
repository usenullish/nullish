import { useState } from "react";
import { Link } from "react-router";
import { Info } from "lucide-react";
import { isNullish, nonNullish } from "@usenullish/nullish-common";
import { SubscriptionStatus } from "@usenullish/nullish-schema/db";
import { SUBSCRIPTION_PLANS_PATH } from "@usenullish/nullish-schema/server";
import { useOrganization } from "~/context/contexts/organization.context";
import { useSubscription } from "~/context/contexts/subscription.context";
import { useIsOrganizationAdmin } from "~/context/hooks/memberships.hooks";
import { useSettings } from "~/context/contexts/settings.context";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { useFormatRelativeDays } from "~/kit/format/date.hooks";
import { OrganizationPath } from "~/navigation";
import { testId } from "~/kit/tests/test.utils";
import { testIds } from "~/kit/tests/test-ids.constants";

export const OrganizationTrialBanner = () => {
  const { i18n } = useI18n();
  const formatRelativeDays = useFormatRelativeDays();
  const [now] = useState(() => new Date());
  const organization = useOrganization();
  const admin = useIsOrganizationAdmin({ organizationId: organization.id });
  const subscription = useSubscription();
  const settings = useSettings();

  const choosePlan = admin && settings?.payments.enabled === true;

  const periodEnd = subscription?.subscription.periodEnd;

  if (
    nonNullish(organization.deletedAt) ||
    subscription?.subscription.status !== SubscriptionStatus.TRIALING ||
    isNullish(periodEnd)
  ) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-amber-500/10 px-4 py-2 text-xs text-amber-700 dark:text-amber-400"
    >
      <Info className="size-4 shrink-0" />
      <p>
        {replacePlaceholders(i18n.organizations.text.trial, {
          "{when}": formatRelativeDays({ date: periodEnd, now }),
        })}{" "}
        {choosePlan && (
          <Link
            to={OrganizationPath.create({ organizationId: organization.id }).to({
              path: SUBSCRIPTION_PLANS_PATH,
            })}
            className="font-medium underline underline-offset-2"
            {...testId(testIds.subscription.choosePlan)}
          >
            {i18n.organizations.action.choose_plan}
          </Link>
        )}
        {choosePlan && i18n.organizations.text.trial_keep_going}
      </p>
    </div>
  );
};
