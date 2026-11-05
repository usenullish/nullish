import { formatIban, isNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { Badge } from "~/ui/components/badge";
import { SortableHeader } from "~/components/core/sortable-header";
import { BankRelationActions } from "~/components/banking/list/bank-relation-actions";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { Amount } from "~/components/core/amount";
import { useFormatDate } from "~/kit/format/date.hooks";

export const BankRelationsTable = ({
  bankRelationSummaries,
}: {
  bankRelationSummaries: Api["BankRelationSummaries"]["Client"]["BankRelationSummary"][];
}) => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader field="name" label={i18n.core.label.name} />
          <SortableHeader field="iban" label={i18n.bank_relations.label.iban} />
          <SortableHeader field="currency" label={i18n.core.label.currency} />
          <TableHead className="text-right">{i18n.bank_relations.label.balance}</TableHead>
          <TableHead>{i18n.bank_relations.label.reconciliation}</TableHead>
          <TableHead className="w-px" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {bankRelationSummaries.length === 0 ? (
          <TableRow>
            <TableCell colSpan={6} className="text-muted-foreground">
              {i18n.bank_relations.text.empty}
            </TableCell>
          </TableRow>
        ) : (
          bankRelationSummaries.map(({ bankRelation, movements: { unreconciled }, balance }) => (
            <TableRow key={bankRelation.id}>
              <TableCell className="whitespace-normal">{bankRelation.name}</TableCell>
              <TableCell className="tabular-nums">{formatIban(bankRelation.iban)}</TableCell>
              <TableCell>{bankRelation.currency}</TableCell>
              <TableCell className="text-right tabular-nums">
                {isNullish(balance) ? (
                  "—"
                ) : (
                  <div className="flex flex-col">
                    <Amount amount={balance.amount} currencyCode={bankRelation.currency} />
                    <span className="text-xs text-muted-foreground">
                      {replacePlaceholders(i18n.bank_relations.text.balance_on, {
                        "{date}": formatDate(balance.on),
                      })}
                    </span>
                  </div>
                )}
              </TableCell>
              <TableCell>
                {unreconciled > 0 ? (
                  <Badge variant="outline">
                    {replacePlaceholders(i18n.bank_relations.text.to_reconcile, {
                      "{count}": `${unreconciled}`,
                    })}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">
                    {i18n.bank_relations.text.up_to_date}
                  </span>
                )}
              </TableCell>
              <TableCell className="w-px">
                <BankRelationActions bankRelation={bankRelation} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
