import type { Api } from "@usenullish/nullish-schema/server";
import { DeleteRecord } from "~/components/core/delete-record";
import { LinesService } from "~/lib/services/invoices+lines.services";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const DeleteLine = ({
  line,
  open,
  onOpenChange,
  onDeleted,
}: {
  line: NonNullable<Api["InvoicesLines"]["Client"]["GetLineResponse"]["line"]>;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => Promise<void>;
}) => {
  const { i18n } = useI18n();

  return (
    <DeleteRecord
      delete={() => LinesService.create().delete({ lineId: line.id })}
      texts={{
        title: replacePlaceholders(i18n.lines.text.delete_title, { "{name}": line.description }),
        description: i18n.lines.text.delete_description,
        success: i18n.lines.toast.delete_success,
        error: i18n.lines.toast.delete_error,
      }}
      open={open}
      onOpenChange={onOpenChange}
      onDeleted={onDeleted}
    />
  );
};
