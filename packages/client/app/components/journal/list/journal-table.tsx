import { Link } from "react-router";
import { cn } from "cn";
import type { Api } from "@usenullish/nullish-schema/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { PostingAmount } from "~/components/journal/posting-amount";
import { SortableHeader } from "~/components/core/sortable-header";
import { JournalEntryActions } from "~/components/journal/list/journal-entry-actions";
import { CopyEntryTagButton } from "~/components/journal/entry-tag";
import { InvoiceJournalBadge } from "~/components/journal/invoice-journal-badge";
import { PeriodJournalBadge } from "~/components/journal/period-journal-badge";
import { MovementJournalBadge } from "~/components/journal/movement-journal-badge";
import { useAccountsUi } from "~/kit/data/accounts.hooks";
import { useAccountingSettings } from "~/context/contexts/accounting-settings.context";
import { useOrganization } from "~/context/contexts/organization.context";
import { AccountingPath } from "~/navigation";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { nonNullish, shortenWithMiddleEllipsis } from "@usenullish/nullish-common";

type JournalSummary = Api["JournalSummaries"]["Client"]["JournalSummary"];

export const JournalTable = ({ journalSummaries }: { journalSummaries: JournalSummary[] }) => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();
  const accountingSettings = useAccountingSettings();
  const organization = useOrganization();
  const { accounts } = useAccountsUi();

  const labels = new Map(accounts.map(({ account, label }) => [account.id, label]));

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader field="number" label={i18n.core.label.number} />
          <SortableHeader field="validOn" label={i18n.core.label.date} />
          <SortableHeader field="reference" label={i18n.core.label.reference} />
          <TableHead>{i18n.journal.label.account}</TableHead>
          <TableHead>{i18n.core.label.description}</TableHead>
          <TableHead className="text-right">{i18n.core.label.debit}</TableHead>
          <TableHead className="text-right">{i18n.core.label.credit}</TableHead>
          <TableHead className="w-px" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {journalSummaries.length === 0 ? (
          <TableRow>
            <TableCell colSpan={8} className="text-muted-foreground">
              {i18n.journal.text.empty}
            </TableCell>
          </TableRow>
        ) : (
          journalSummaries.flatMap(
            ({ entry, postings, invoiceJournal, periodJournal, movementJournal }) =>
              postings.map((posting, i) => {
                const first = i === 0;

                return (
                  <TableRow
                    key={posting.id}
                    className={cn("group", i < postings.length - 1 && "border-b-0")}
                  >
                    <TableCell className="tabular-nums">
                      {first ? (
                        <span className="inline-flex items-center gap-1">
                          <Link
                            className="underline underline-offset-4"
                            to={AccountingPath.create({ organizationId: organization.id }).to({
                              path: `/journal/${entry.id}`,
                            })}
                          >
                            {entry.number}
                          </Link>
                          <CopyEntryTagButton
                            source={{ entry, postings }}
                            className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                          />
                        </span>
                      ) : null}
                    </TableCell>
                    <TableCell>{first ? formatDate(entry.validOn) : null}</TableCell>
                    <TableCell className="whitespace-normal">
                      {first && (
                        <div className="flex flex-wrap items-center gap-1">
                          {nonNullish(invoiceJournal) ? (
                            <InvoiceJournalBadge invoiceJournal={invoiceJournal} />
                          ) : nonNullish(periodJournal) ? (
                            <PeriodJournalBadge periodJournal={periodJournal} />
                          ) : (
                            entry.reference
                          )}
                          {nonNullish(movementJournal) && (
                            <MovementJournalBadge movementJournal={movementJournal} />
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      {labels.get(posting.accountId) ??
                        shortenWithMiddleEllipsis({ text: posting.accountId })}
                    </TableCell>
                    <TableCell className="whitespace-normal">{posting.description}</TableCell>
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
                      {first ? (
                        <JournalEntryActions
                          entry={entry}
                          invoiceJournal={invoiceJournal}
                          periodJournal={periodJournal}
                        />
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              }),
          )
        )}
      </TableBody>
    </Table>
  );
};
