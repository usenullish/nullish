import type { Api } from "@usenullish/nullish-schema/server";
import { DeleteRecord } from "~/components/core/delete-record";
import { ClientsService } from "~/lib/services/clients.services";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const DeleteClient = ({
  client: { id, name },
  open,
  onOpenChange,
  onDeleted,
}: {
  client: Pick<NonNullable<Api["Clients"]["Client"]["GetClientResponse"]["client"]>, "id" | "name">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => Promise<void>;
}) => {
  const { i18n } = useI18n();

  return (
    <DeleteRecord
      delete={() => ClientsService.create().delete({ id })}
      texts={{
        title: replacePlaceholders(i18n.clients.text.delete_title, { "{name}": name }),
        description: i18n.clients.text.delete_description,
        success: i18n.clients.toast.delete_success,
        error: i18n.clients.toast.delete_error,
      }}
      open={open}
      onOpenChange={onOpenChange}
      onDeleted={onDeleted}
    />
  );
};
