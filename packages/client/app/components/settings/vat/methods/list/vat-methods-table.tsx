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
import { RecordActions } from "~/components/core/record-actions";
import { useOrganization } from "~/context/contexts/organization.context";
import { AccountingPath } from "~/navigation";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const VatMethodsTable = ({
  methods,
  periods,
}: {
  methods: Api["VatMethods"]["Client"]["VatMethod"][];
  periods: Api["Periods"]["Client"]["Period"][];
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const formatDate = useFormatDate();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{i18n.periods.label.period}</TableHead>
          <TableHead>{i18n.vat.label.payment_method}</TableHead>
          <TableHead>{i18n.vat.label.remuneration_method}</TableHead>
          <TableHead className="w-px" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {methods.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-muted-foreground">
              {i18n.vat.text.methods_empty}
            </TableCell>
          </TableRow>
        ) : (
          methods.map((method) => {
            const period = periods.find(({ id }) => id === method.periodId);

            return (
              <TableRow key={method.id}>
                <TableCell>
                  {period === undefined
                    ? ""
                    : `${formatDate(period.startOn)} – ${formatDate(period.endOn)}`}
                </TableCell>
                <TableCell>{i18n.vat.payment_method[method.paymentMethod]}</TableCell>
                <TableCell>{i18n.vat.remuneration_method[method.remunerationMethod]}</TableCell>
                <TableCell className="w-px">
                  <RecordActions
                    record={method}
                    items={
                      <WriteGuard>
                        <DropdownMenuItem
                          render={
                            <Link
                              to={AccountingPath.create({
                                organizationId: organization.id,
                              }).to({ path: `/vat/methods/${method.id}` })}
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
            );
          })
        )}
      </TableBody>
    </Table>
  );
};
