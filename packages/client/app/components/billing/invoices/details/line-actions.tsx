import { useState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { InvoiceStatus } from "@usenullish/nullish-schema/db";
import { DropdownMenuItem } from "~/ui/components/dropdown-menu";
import { RecordActions } from "~/components/core/record-actions";
import { DeleteLine } from "~/components/billing/invoices/delete/delete-line";
import { useInvoice } from "~/context/contexts/invoice.context";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const LineActions = ({
  line,
}: {
  line: NonNullable<Api["InvoicesLines"]["Client"]["GetLineResponse"]["line"]>;
}) => {
  const { i18n } = useI18n();
  const invoice = useInvoice();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deletable = invoice.status === InvoiceStatus.DRAFT;

  return (
    <RecordActions
      record={line}
      items={
        deletable && (
          <WriteGuard>
            <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
              {i18n.core.action.delete}
            </DropdownMenuItem>
          </WriteGuard>
        )
      }
    >
      {deletable && <DeleteLine line={line} open={deleteOpen} onOpenChange={setDeleteOpen} />}
    </RecordActions>
  );
};
