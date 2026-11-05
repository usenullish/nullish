import type { Api } from "@usenullish/nullish-schema/server";
import { DeleteRecord } from "~/components/core/delete-record";
import { ContactsService } from "~/lib/services/clients+contacts.services";
import { nonNullish } from "@usenullish/nullish-common";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const DeleteContact = ({
  contact,
  open,
  onOpenChange,
  onDeleted,
}: {
  contact: NonNullable<Api["Contacts"]["Client"]["GetContactResponse"]["contact"]>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => Promise<void>;
}) => {
  const { i18n } = useI18n();

  return (
    <DeleteRecord
      delete={() => ContactsService.create().delete({ id: contact.id })}
      texts={{
        title: replacePlaceholders(i18n.contacts.text.delete_title, {
          "{name}": [contact.firstName, contact.lastName].filter(nonNullish).join(" "),
        }),
        description: i18n.contacts.text.delete_description,
        success: i18n.contacts.toast.delete_success,
        error: i18n.contacts.toast.delete_error,
      }}
      open={open}
      onOpenChange={onOpenChange}
      onDeleted={onDeleted}
    />
  );
};
