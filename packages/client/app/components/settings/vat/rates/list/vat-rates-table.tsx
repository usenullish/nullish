import { Link } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { DropdownMenuItem } from "~/ui/components/dropdown-menu";
import { SortableHeader } from "~/components/core/sortable-header";
import { RecordActions } from "~/components/core/record-actions";
import { useOrganization } from "~/context/contexts/organization.context";
import { AccountingPath } from "~/navigation";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useFormatNumber } from "~/kit/format/number.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const VatRatesTable = ({ rates }: { rates: Api["VatRates"]["Client"]["VatRate"][] }) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const formatDate = useFormatDate();
  const formatNumber = useFormatNumber();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader field="code" label={i18n.core.label.code} />
          <SortableHeader field="type" label={i18n.core.label.type} />
          <SortableHeader field="rate" label={i18n.core.label.rate} />
          <TableHead>{i18n.vat.label.net_rate}</TableHead>
          <SortableHeader field="startOn" label={i18n.core.label.from} />
          <SortableHeader field="endOn" label={i18n.core.label.to} />
          <TableHead className="w-px" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {rates.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-muted-foreground">
              {i18n.vat.text.rates_empty}
            </TableCell>
          </TableRow>
        ) : (
          rates.map((rate) => (
            <TableRow key={rate.id}>
              <TableCell>{rate.code}</TableCell>
              <TableCell className="whitespace-normal">{i18n.vat.type[rate.type]}</TableCell>
              <TableCell className="tabular-nums">
                {formatNumber({ value: rate.rate, maximumFractionDigits: 3 })} %
              </TableCell>
              <TableCell className="tabular-nums">
                {rate.netRate === null
                  ? ""
                  : `${formatNumber({ value: rate.netRate, maximumFractionDigits: 3 })} %`}
              </TableCell>
              <TableCell>{formatDate(rate.startOn)}</TableCell>
              <TableCell>{rate.endOn === null ? "" : formatDate(rate.endOn)}</TableCell>
              <TableCell className="w-px">
                <RecordActions
                  record={rate}
                  items={
                    <WriteGuard>
                      <DropdownMenuItem
                        render={
                          <Link
                            to={AccountingPath.create({
                              organizationId: organization.id,
                            }).to({ path: `/vat/rates/${rate.id}` })}
                          />
                        }
                      >
                        {i18n.core.action.edit}
                      </DropdownMenuItem>
                    </WriteGuard>
                  }
                />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
