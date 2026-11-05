import { formatIban } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { SortableHeader } from "~/components/core/sortable-header";
import { useAccountsUi } from "~/kit/data/accounts.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { BankRelationActions } from "~/components/settings/bank-relations/list/bank-relation-actions";

export const BankRelationsTable = ({
  bankRelations,
}: {
  bankRelations: Api["BankRelations"]["Client"]["BankRelation"][];
}) => {
  const { i18n } = useI18n();
  const { accounts } = useAccountsUi();

  const labels = new Map(accounts.map(({ account, label }) => [account.id, label]));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader field="name" label={i18n.core.label.name} />
          <SortableHeader field="iban" label={i18n.bank_relations.label.iban} />
          <SortableHeader field="currency" label={i18n.core.label.currency} />
          <TableHead>{i18n.bank_relations.label.account}</TableHead>
          <TableHead className="w-px" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {bankRelations.length === 0 ? (
          <TableRow>
            <TableCell colSpan={5} className="text-muted-foreground">
              {i18n.bank_relations.text.empty}
            </TableCell>
          </TableRow>
        ) : (
          bankRelations.map((bankRelation) => (
            <TableRow key={bankRelation.id}>
              <TableCell className="whitespace-normal">{bankRelation.name}</TableCell>
              <TableCell className="tabular-nums">{formatIban(bankRelation.iban)}</TableCell>
              <TableCell>{bankRelation.currency}</TableCell>
              <TableCell className="whitespace-normal">
                {labels.get(bankRelation.accountId)}
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
