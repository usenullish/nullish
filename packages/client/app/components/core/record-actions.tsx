import { type ReactNode, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "~/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/ui/components/dropdown-menu";
import {
  type AuditedRecord,
  RecordDetails,
  type RecordReference,
} from "~/components/core/record-details";
import { useI18n } from "~/kit/i18n/i18n.context";

export const RecordActions = ({
  record,
  references,
  items,
  children,
}: {
  record: AuditedRecord;
  references?: RecordReference[];
  items?: ReactNode;
  children?: ReactNode;
}) => {
  const { i18n } = useI18n();
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon-sm" aria-label={i18n.core.action.more_actions} />
          }
        >
          <MoreHorizontal />
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end">
          {items}
          <DropdownMenuItem onClick={() => setDetailsOpen(true)}>
            {i18n.core.action.details}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RecordDetails
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        record={record}
        references={references}
      />

      {children}
    </>
  );
};
