import { useState } from "react";
import { Info } from "lucide-react";
import { isNullish } from "@usenullish/nullish-common";
import { useOrganization } from "~/context/contexts/organization.context";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { useFormatDate } from "~/kit/format/date.hooks";

export const OrganizationDeletedBanner = () => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const formatDate = useFormatDate();
  const [now] = useState(() => new Date());

  if (isNullish(organization.deletedAt)) {
    return null;
  }

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-destructive/10 px-4 py-2 text-xs text-destructive"
    >
      <Info className="size-4 shrink-0" />
      <p>
        {replacePlaceholders(
          organization.deletedAt > now
            ? i18n.organizations.text.deletion_scheduled
            : i18n.organizations.text.deleted,
          {
            "{date}": formatDate(organization.deletedAt),
          },
        )}
      </p>
    </div>
  );
};
