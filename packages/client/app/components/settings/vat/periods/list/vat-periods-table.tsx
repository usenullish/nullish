import type { Api } from "@usenullish/nullish-schema/server";
import { VatPeriodStatus } from "@usenullish/nullish-schema/db";
import { Badge } from "~/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { SortableHeader } from "~/components/core/sortable-header";
import { VatPeriodActions } from "~/components/settings/vat/periods/list/vat-period-actions";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";

export const VatPeriodsTable = ({
  periods,
}: {
  periods: Api["VatPeriods"]["Client"]["VatPeriod"][];
}) => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader field="startOn" label={i18n.core.label.from} />
          <SortableHeader field="endOn" label={i18n.core.label.to} />
          <SortableHeader field="status" label={i18n.core.label.status} />
          <TableHead className="w-px" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {periods.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-muted-foreground">
              {i18n.vat.text.periods_empty}
            </TableCell>
          </TableRow>
        ) : (
          periods.map((period) => (
            <TableRow key={period.id}>
              <TableCell>{formatDate(period.startOn)}</TableCell>
              <TableCell>{formatDate(period.endOn)}</TableCell>
              <TableCell>
                <Badge variant={period.status === VatPeriodStatus.OPEN ? "outline" : "secondary"}>
                  {i18n.core.status[period.status]}
                </Badge>
              </TableCell>
              <TableCell className="w-px">
                <VatPeriodActions period={period} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
