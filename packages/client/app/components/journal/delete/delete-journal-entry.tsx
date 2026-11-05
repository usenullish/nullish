import type { Api } from "@usenullish/nullish-schema/server";
import { DeleteRecord } from "~/components/core/delete-record";
import { JournalService } from "~/lib/services/journal.services";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const DeleteJournalEntry = ({
  entry,
  open,
  onOpenChange,
  onDeleted,
}: {
  entry: Api["Journal"]["Client"]["GetJournalEntriesResponse"]["journalEntries"][number]["entry"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => Promise<void>;
}) => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();

  return (
    <DeleteRecord
      delete={() => JournalService.create().delete({ journalEntryId: entry.id })}
      texts={{
        title: replacePlaceholders(i18n.journal.text.delete_title, {
          "{name}": entry.reference ?? formatDate(entry.validOn),
        }),
        description: i18n.journal.text.delete_description,
        success: i18n.journal.toast.delete_success,
        error: i18n.journal.toast.delete_error,
      }}
      open={open}
      onOpenChange={onOpenChange}
      onDeleted={onDeleted}
    />
  );
};
