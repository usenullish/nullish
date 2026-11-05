import { CopyIcon } from "~/components/core/copy-icon";
import { Button } from "~/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/ui/components/dialog";
import { useFormatDateTime } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useCopy } from "~/kit/utils/copy.hook";

export interface AuditedRecord {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface RecordReference {
  label: string;
  id: string;
}

const CopyableId = ({ id }: { id: string }) => {
  const { i18n } = useI18n();

  const { copy: copyToClipboard, copied } = useCopy();

  const copy = async () => {
    await copyToClipboard(id);
  };

  return (
    <span className="flex items-center gap-1">
      <span className="break-all">{id}</span>
      <Button variant="ghost" size="icon-xs" aria-label={i18n.core.action.copy} onClick={copy}>
        <CopyIcon copied={copied} />
      </Button>
    </span>
  );
};

export const RecordDetails = ({
  open,
  onOpenChange,
  record,
  references = [],
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  record: AuditedRecord;
  references?: RecordReference[];
}) => {
  const { i18n } = useI18n();
  const formatDateTime = useFormatDateTime();

  const rows = [
    { label: i18n.core.label.id, value: <CopyableId id={record.id} /> },
    ...references.map(({ label, id }) => ({ label, value: <CopyableId id={id} /> })),
    { label: i18n.core.label.created_at, value: formatDateTime(record.createdAt) },
    { label: i18n.core.label.updated_at, value: formatDateTime(record.updatedAt) },
    { label: i18n.core.label.version, value: record.version },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{i18n.core.action.details}</DialogTitle>
        </DialogHeader>

        <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2">
          {rows.map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
};
