import { Link } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { Badge } from "~/ui/components/badge";
import { useOrganization } from "~/context/contexts/organization.context";
import { BillingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";

export const InvoiceJournalBadge = ({
  invoiceJournal: { invoiceId, type },
}: {
  invoiceJournal: NonNullable<
    Api["JournalSummaries"]["Client"]["JournalSummary"]["invoiceJournal"]
  >;
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  return (
    <Badge
      variant="outline"
      render={
        <Link
          to={BillingPath.create({ organizationId: organization.id }).to({
            path: `/invoices/${invoiceId}`,
          })}
        />
      }
    >
      {i18n.journal.invoice_journal[type]}
    </Badge>
  );
};
