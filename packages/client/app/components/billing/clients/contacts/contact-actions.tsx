import { useState } from "react";
import { Link } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { DropdownMenuItem } from "~/ui/components/dropdown-menu";
import { RecordActions } from "~/components/core/record-actions";
import { DeleteContact } from "~/components/billing/clients/delete/delete-contact";
import { useOrganization } from "~/context/contexts/organization.context";
import { BillingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const ContactActions = ({
  contact,
  clientId,
}: {
  contact: NonNullable<Api["Contacts"]["Client"]["GetContactResponse"]["contact"]>;
  clientId: NonNullable<Api["Clients"]["Client"]["GetClientResponse"]["client"]>["id"];
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <RecordActions
      record={contact}
      items={
        <>
          <WriteGuard>
            <DropdownMenuItem
              render={
                <Link
                  to={BillingPath.create({ organizationId: organization.id }).to({
                    path: `/clients/${clientId}/contacts/${contact.id}/edit`,
                  })}
                />
              }
            >
              {i18n.core.action.edit}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
              {i18n.core.action.delete}
            </DropdownMenuItem>
          </WriteGuard>
        </>
      }
    >
      <DeleteContact contact={contact} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </RecordActions>
  );
};
