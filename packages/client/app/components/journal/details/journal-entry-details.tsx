import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { isNullish, nonNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { DeleteJournalEntry } from "~/components/journal/delete/delete-journal-entry";
import { Badge } from "~/ui/components/badge";
import { InvoiceJournalBadge } from "~/components/journal/invoice-journal-badge";
import { PeriodJournalBadge } from "~/components/journal/period-journal-badge";
import { MovementJournalBadge } from "~/components/journal/movement-journal-badge";
import { useOrganization } from "~/context/contexts/organization.context";
import { AccountingPath } from "~/navigation";
import { useFormatDate } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";
import { CopyEntryTagButton } from "~/components/journal/entry-tag";
import { entryTag } from "~/components/journal/_entry-tag";

export const JournalEntryDetails = ({
  entry,
  postings,
  invoiceJournal,
  periodJournal,
  movementJournal,
}: {
  entry: Api["JournalSummaries"]["Client"]["JournalSummary"]["entry"];
  postings: Api["JournalSummaries"]["Client"]["JournalSummary"]["postings"];
  invoiceJournal: Api["JournalSummaries"]["Client"]["JournalSummary"]["invoiceJournal"];
  periodJournal: Api["JournalSummaries"]["Client"]["JournalSummary"]["periodJournal"];
  movementJournal: Api["JournalSummaries"]["Client"]["JournalSummary"]["movementJournal"];
}) => {
  const { i18n } = useI18n();
  const formatDate = useFormatDate();
  const organization = useOrganization();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const rows = [
    { label: i18n.core.label.number, value: entry.number },
    { label: i18n.core.label.date, value: formatDate(entry.validOn) },
    { label: i18n.core.label.reference, value: entry.reference },
    {
      label: i18n.journal.label.tag,
      value: (
        <span className="inline-flex items-center gap-1">
          <span className="break-all">{entryTag({ entry, postings })}</span>
          <CopyEntryTagButton source={{ entry, postings }} />
        </span>
      ),
    },
    {
      label: i18n.journal.label.invoice,
      value: isNullish(invoiceJournal) ? null : (
        <InvoiceJournalBadge invoiceJournal={invoiceJournal} />
      ),
    },
    {
      label: i18n.journal.label.period,
      value: isNullish(periodJournal) ? null : <PeriodJournalBadge periodJournal={periodJournal} />,
    },
    {
      label: i18n.journal.label.movement,
      value: isNullish(movementJournal) ? null : (
        <MovementJournalBadge movementJournal={movementJournal} />
      ),
    },
    {
      label: i18n.journal.label.origin,
      value: entry.migrated ? <Badge variant="outline">{i18n.journal.text.migrated}</Badge> : null,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <WriteGuard>
          {isNullish(invoiceJournal) && isNullish(periodJournal) && !entry.migrated && (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link
                      to={AccountingPath.create({ organizationId: organization.id }).to({
                        path: `/journal/${entry.id}/edit`,
                      })}
                    />
                  }
                >
                  {i18n.core.action.edit}
                </Button>

                <Button
                  variant="outline"
                  nativeButton={false}
                  render={
                    <Link
                      to={AccountingPath.create({ organizationId: organization.id }).to({
                        path: `/journal/${entry.id}/duplicate`,
                      })}
                    />
                  }
                >
                  {i18n.journal.action.duplicate}
                </Button>

                <Button variant="outline" onClick={() => setDeleteOpen(true)}>
                  {i18n.core.action.delete}
                </Button>
              </div>

              <DeleteJournalEntry
                entry={entry}
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                onDeleted={async () => {
                  await navigate(
                    AccountingPath.create({ organizationId: organization.id }).to({
                      path: "/journal",
                    }),
                  );
                }}
              />
            </>
          )}
        </WriteGuard>
      </div>

      <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 text-xs">
        {rows
          .filter(({ value }) => nonNullish(value))
          .map(({ label, value }) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
      </dl>
    </div>
  );
};
