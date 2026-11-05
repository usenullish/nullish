import type { Api } from "@usenullish/nullish-schema/server";
import { InvoiceStatus } from "@usenullish/nullish-schema/db";
import { Badge } from "~/ui/components/badge";
import { useI18n } from "~/kit/i18n/i18n.context";

const ACTIVE_STATUSES: readonly InvoiceStatus[] = [InvoiceStatus.DRAFT, InvoiceStatus.OPEN];

export const InvoiceStatusBadge = ({
  status,
}: {
  status: Api["Invoices"]["Client"]["Invoice"]["status"];
}) => {
  const { i18n } = useI18n();

  return (
    <Badge variant={ACTIVE_STATUSES.includes(status) ? "outline" : "secondary"}>
      {i18n.invoices.status[status]}
    </Badge>
  );
};
