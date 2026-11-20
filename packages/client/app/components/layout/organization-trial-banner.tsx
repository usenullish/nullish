import { Link } from "react-router";
import { Info } from "lucide-react";
import { isNullish } from "@usenullish/nullish-common";
import { SubscriptionStatus } from "@usenullish/nullish-schema/db";
import { SUBSCRIPTION_PLANS_PATH } from "@usenullish/nullish-schema/server";
import { useOrganization } from "~/context/contexts/organization.context";
import { useSubscriptionSummary } from "~/context/contexts/subscription-summary.context";
import { useIsOrganizationAdmin } from "~/context/hooks/memberships.hooks";
import { useSettings } from "~/context/contexts/settings.context";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { useFormatDate } from "~/kit/format/date.hooks";
import { OrganizationPath } from "~/navigation";

export const OrganizationTrialBanner = () => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();
  const organization = useOrganization();
  const admin = useIsOrganizationAdmin({ organizationId: organization.id });
  const subscriptionSummary = useSubscriptionSummary();
  const settings = useSettings();

  const choosePlan = admin && settings?.payments.enabled === true;

  const periodEnd = subscriptionSummary?.subscription.periodEnd;

  if (
    subscriptionSummary?.subscription.status !== SubscriptionStatus.TRIALING ||
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
          "{date}": formatDate(periodEnd),
        })}{" "}
        {choosePlan && (
          <Link
            to={OrganizationPath.create({ organizationId: organization.id }).to({
              path: SUBSCRIPTION_PLANS_PATH,
            })}
            className="font-medium underline underline-offset-2"
          >
            {i18n.organizations.action.choose_plan}
          </Link>
        )}
        {choosePlan && i18n.organizations.text.trial_keep_going}
      </p>
    </div>
  );
};
