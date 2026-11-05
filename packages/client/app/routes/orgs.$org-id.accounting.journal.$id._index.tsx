import { useJournalEntry } from "~/context/contexts/journal-entry.context";
import { JournalEntryDetails } from "~/components/journal/details/journal-entry-details";
import { PostingsTable } from "~/components/journal/details/postings-table";
import { PostingsTotals } from "~/components/journal/details/postings-totals";
import type { BreadcrumbHandle } from "~/kit/router/route-handle";
import { AccountingPath } from "~/navigation";

export const handle: BreadcrumbHandle = {
  breadcrumb: {
    back: ({ organizationId }) =>
      AccountingPath.create({ organizationId }).to({ path: "/journal" }),
    label: ({ i18n }) => i18n.journal.text.details,
  },
};

// /orgs/:org-id/journal/:id
const JournalEntryDetailsPage = () => {
  const { entry, postings, invoiceJournal, periodJournal, movementJournal, vatPostings } =
    useJournalEntry();

  return (
    <div className="flex flex-col gap-8">
      <JournalEntryDetails
        entry={entry}
        postings={postings}
        invoiceJournal={invoiceJournal}
        periodJournal={periodJournal}
        movementJournal={movementJournal}
      />

      <PostingsTable postings={postings} vatPostings={vatPostings} />

      <PostingsTotals postings={postings} />
    </div>
  );
};

export default JournalEntryDetailsPage;
