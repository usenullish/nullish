import { nonNullish } from "@usenullish/nullish-common";
import { Amount } from "~/components/core/amount";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { useAccountingSettings } from "~/context/contexts/accounting-settings.context";
import { useI18n } from "~/kit/i18n/i18n.context";

export interface VatDeclarationRow {
  box: string;
  label: string;
  amount: bigint;
  taxableBase?: bigint;
  total?: boolean;
}

export const VatDeclarationSection = ({
  title,
  rows,
  withTaxableBase = false,
}: {
  title: string;
  rows: VatDeclarationRow[];
  withTaxableBase?: boolean;
}) => {
  const { i18n } = useI18n();
  const accountingSettings = useAccountingSettings();

  const currency = accountingSettings?.baseCurrency;

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-medium">{title}</h2>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-px">{i18n.reports.label.box}</TableHead>
            <TableHead>{i18n.core.label.description}</TableHead>
            {withTaxableBase && (
              <TableHead className="w-px text-right">{i18n.reports.label.taxable_base}</TableHead>
            )}
            <TableHead className="w-px text-right">
              {withTaxableBase ? i18n.reports.label.tax : i18n.core.label.amount}
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map(({ box, label, amount, taxableBase, total = false }) => (
            <TableRow key={`${box}-${label}`} className={total ? "font-medium" : undefined}>
              <TableCell className="w-px tabular-nums">{box}</TableCell>
              <TableCell className="whitespace-normal">{label}</TableCell>
              {withTaxableBase && (
                <TableCell className="w-px text-right tabular-nums">
                  {nonNullish(taxableBase) && (
                    <Amount amount={taxableBase} currencyCode={currency} />
                  )}
                </TableCell>
              )}
              <TableCell className="w-px text-right tabular-nums">
                <Amount amount={amount} currencyCode={currency} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </section>
  );
};
