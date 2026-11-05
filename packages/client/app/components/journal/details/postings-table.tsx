import { shortenWithMiddleEllipsis } from "@usenullish/nullish-common";
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
import { RecordActions } from "~/components/core/record-actions";
import { PostingAmount } from "~/components/journal/posting-amount";
import { useAccountsUi } from "~/kit/data/accounts.hooks";
import { useAccountingSettings } from "~/context/contexts/accounting-settings.context";
import { useI18n } from "~/kit/i18n/i18n.context";

export const PostingsTable = ({
  postings,
  vatPostings,
}: {
  postings: Api["Journal"]["Client"]["GetJournalEntriesResponse"]["journalEntries"][number]["postings"];
  vatPostings: Api["JournalSummaries"]["Client"]["JournalSummary"]["vatPostings"];
}) => {
  const { i18n } = useI18n();
  const accountingSettings = useAccountingSettings();
  const { accounts } = useAccountsUi();

  const labels = new Map(accounts.map(({ account, label }) => [account.id, label]));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{i18n.journal.label.account}</TableHead>
          <TableHead>{i18n.core.label.description}</TableHead>
          <TableHead className="text-right">{i18n.core.label.debit}</TableHead>
          <TableHead className="text-right">{i18n.core.label.credit}</TableHead>
          <TableHead className="w-px" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {postings.map((posting) => (
          <TableRow key={posting.id}>
            <TableCell className="whitespace-normal">
              {labels.get(posting.accountId) ??
                shortenWithMiddleEllipsis({ text: posting.accountId })}
            </TableCell>
            <TableCell className="whitespace-normal">
              <span className="flex items-center gap-2">
                {posting.description}
                {vatPostings.some(({ vatPostingId }) => vatPostingId === posting.id) && (
                  <Badge variant="outline">{i18n.journal.label.vat_posting}</Badge>
                )}
              </span>
            </TableCell>
            <TableCell className="text-right tabular-nums">
              <PostingAmount
                posting={posting}
                amount={posting.debit}
                baseCurrency={accountingSettings?.baseCurrency}
              />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              <PostingAmount
                posting={posting}
                amount={posting.credit}
                baseCurrency={accountingSettings?.baseCurrency}
              />
            </TableCell>
            <TableCell className="w-px">
              <RecordActions record={posting} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
