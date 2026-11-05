import type { Api } from "@usenullish/nullish-schema/server";
import { DeleteRecord } from "~/components/core/delete-record";
import { OrganizationsService } from "~/lib/services/organizations.services";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const DeleteOrganization = ({
  organization,
  open,
  onOpenChange,
}: {
  organization: Api["Organizations"]["Client"]["Organization"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { i18n } = useI18n();

  return (
    <DeleteRecord
      delete={() => OrganizationsService.create().delete({ orgId: organization.id })}
      texts={{
        title: replacePlaceholders(i18n.organizations.text.delete_title, {
          "{name}": organization.name,
        }),
        description: i18n.organizations.text.delete_description,
        success: i18n.organizations.toast.delete_success,
        error: i18n.organizations.toast.delete_error,
      }}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
};
