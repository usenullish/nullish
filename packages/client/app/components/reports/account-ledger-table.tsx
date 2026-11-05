import { Link } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { nonNullish, type Option } from "@usenullish/nullish-common";
import { Amount } from "~/components/core/amount";
import { SortableHeader } from "~/components/core/sortable-header";
import { useOrganization } from "~/context/contexts/organization.context";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { AccountingPath } from "~/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";

type AccountLedgerPosting = Api["AccountLedger"]["Client"]["AccountLedgerPosting"];
type AccountLedgerTotals = Api["AccountLedger"]["Client"]["GetAccountLedgerResponse"]["totals"];

const LedgerAmount = ({
  amount,
  baseAmount,
  currency,
  baseCurrency,
}: {
  amount: bigint;
  baseAmount: bigint;
  currency: AccountLedgerPosting["currency"];
  baseCurrency: Option<AccountLedgerPosting["currency"]>;
}) =>
  amount === 0n ? null : (
    <>
      <Amount amount={baseAmount} currencyCode={baseCurrency} />
      {currency !== baseCurrency && (
        <span className="text-muted-foreground">
          {" "}
          (<Amount amount={amount} currencyCode={currency} />)
        </span>
      )}
    </>
  );

export const AccountLedgerTable = ({
  postings,
  totals,
  baseCurrency,
}: {
  postings: AccountLedgerPosting[];
  totals: Option<AccountLedgerTotals>;
  baseCurrency: Option<AccountLedgerPosting["currency"]>;
}) => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();
  const organization = useOrganization();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader field="validOn" label={i18n.core.label.date} />
          <SortableHeader field="number" label={i18n.core.label.number} />
          <SortableHeader field="reference" label={i18n.core.label.reference} />
          <SortableHeader field="description" label={i18n.core.label.description} />
          <TableHead className="text-right">{i18n.core.label.debit}</TableHead>
          <TableHead className="text-right">{i18n.core.label.credit}</TableHead>
          <TableHead className="text-right">{i18n.core.label.balance}</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {postings.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-muted-foreground">
              {i18n.reports.text.account_ledger_empty}
            </TableCell>
          </TableRow>
        ) : (
          postings.map((posting) => (
            <TableRow key={posting.postingId}>
              <TableCell>{formatDate(posting.validOn)}</TableCell>
              <TableCell className="tabular-nums">
                <Link
                  className="underline underline-offset-4"
                  to={AccountingPath.create({ organizationId: organization.id }).to({
                    path: `/journal/${posting.journalEntryId}`,
                  })}
                >
                  {posting.number}
                </Link>
              </TableCell>
              <TableCell className="whitespace-normal">{posting.reference}</TableCell>
              <TableCell className="whitespace-normal">{posting.description}</TableCell>
              <TableCell className="text-right tabular-nums">
                <LedgerAmount
                  amount={posting.debit}
                  baseAmount={posting.baseDebit}
                  currency={posting.currency}
                  baseCurrency={baseCurrency}
                />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <LedgerAmount
                  amount={posting.credit}
                  baseAmount={posting.baseCredit}
                  currency={posting.currency}
                  baseCurrency={baseCurrency}
                />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                <Amount amount={posting.balance} currencyCode={baseCurrency} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>

      {postings.length > 0 && nonNullish(totals) && (
        <TableFooter>
          <TableRow>
            <TableCell colSpan={4}>{i18n.reports.label.total}</TableCell>
            <TableCell className="text-right tabular-nums">
              <Amount amount={totals.baseDebit} currencyCode={baseCurrency} />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              <Amount amount={totals.baseCredit} currencyCode={baseCurrency} />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {nonNullish(totals.balance) && (
                <Amount amount={totals.balance} currencyCode={baseCurrency} />
              )}
            </TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
};
