import type { Api } from "@usenullish/nullish-schema/server";
import { PeriodStatus } from "@usenullish/nullish-schema/db";
import { Badge } from "~/ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { PeriodActions } from "~/components/settings/periods/list/period-actions";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useFormatDate } from "~/kit/format/date.hooks";

export const PeriodsTable = ({ periods }: { periods: Api["Periods"]["Client"]["Period"][] }) => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-px">{i18n.periods.label.period}</TableHead>
          <TableHead className="w-px">{i18n.core.label.status}</TableHead>
          <TableHead />
        </TableRow>
      </TableHeader>

      <TableBody>
        {periods.length === 0 ? (
          <TableRow>
            <TableCell colSpan={3} className="text-muted-foreground">
              {i18n.periods.text.empty}
            </TableCell>
          </TableRow>
        ) : (
          periods.map((period) => (
            <TableRow key={period.id}>
              <TableCell className="w-px">
                {formatDate(period.startOn)} – {formatDate(period.endOn)}
              </TableCell>
              <TableCell className="w-px">
                <Badge variant={period.status === PeriodStatus.OPEN ? "outline" : "secondary"}>
                  {i18n.core.status[period.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <PeriodActions period={period} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
