import { useState } from "react";
import { Link } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { InvoiceStatus } from "@usenullish/nullish-schema/db";
import { DropdownMenuItem } from "~/ui/components/dropdown-menu";
import { RecordActions } from "~/components/core/record-actions";
import { DeleteInvoice } from "~/components/billing/invoices/delete/delete-invoice";
import { useOrganization } from "~/context/contexts/organization.context";
import { BillingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const InvoiceActions = ({
  invoice,
}: {
  invoice: Api["InvoiceSummaries"]["Client"]["InvoiceSummary"]["invoice"];
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const deletable = invoice.status === InvoiceStatus.DRAFT;

  return (
    <RecordActions
      record={invoice}
      items={
        <>
          <DropdownMenuItem
            render={
              <Link
                to={BillingPath.create({ organizationId: organization.id }).to({
                  path: `/invoices/${invoice.id}`,
                })}
              />
            }
          >
            {i18n.core.action.open}
          </DropdownMenuItem>
          {deletable && (
            <WriteGuard>
              <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
                {i18n.core.action.delete}
              </DropdownMenuItem>
            </WriteGuard>
          )}
        </>
      }
    >
      {deletable && (
        <DeleteInvoice invoice={invoice} open={deleteOpen} onOpenChange={setDeleteOpen} />
      )}
    </RecordActions>
  );
};
