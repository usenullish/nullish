import { useState } from "react";
import { Info } from "lucide-react";
import { isNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { useOrganization } from "~/context/contexts/organization.context";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { useFormatDate } from "~/kit/format/date.hooks";

type DeletedAt = NonNullable<Api["Organizations"]["Client"]["Organization"]["deletedAt"]>;

export const OrganizationDeletedBanner = () => {
  const organization = useOrganization();

  if (isNullish(organization.deletedAt)) {
    return null;
  }

  return (
    <DeletedBanner key={organization.deletedAt.getTime()} deletedAt={organization.deletedAt} />
  );
};

const DeletedBanner = ({ deletedAt }: { deletedAt: DeletedAt }) => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();
  const [now] = useState(() => new Date());

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-destructive/10 px-4 py-2 text-xs text-destructive"
    >
      <Info className="size-4 shrink-0" />
      <p>
        {replacePlaceholders(
          deletedAt > now
            ? i18n.organizations.text.deletion_scheduled
            : i18n.organizations.text.deleted,
          {
            "{date}": formatDate(deletedAt),
          },
        )}
      </p>
    </div>
  );
};
