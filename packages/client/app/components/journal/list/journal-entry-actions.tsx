import { useState } from "react";
import { Link } from "react-router";
import { isNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { DropdownMenuItem } from "~/ui/components/dropdown-menu";
import { RecordActions } from "~/components/core/record-actions";
import { DeleteJournalEntry } from "~/components/journal/delete/delete-journal-entry";
import { useOrganization } from "~/context/contexts/organization.context";
import { AccountingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const JournalEntryActions = ({
  entry,
  invoiceJournal,
  periodJournal,
}: {
  entry: Api["JournalSummaries"]["Client"]["JournalSummary"]["entry"];
  invoiceJournal: Api["JournalSummaries"]["Client"]["JournalSummary"]["invoiceJournal"];
  periodJournal: Api["JournalSummaries"]["Client"]["JournalSummary"]["periodJournal"];
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const editable = isNullish(invoiceJournal) && isNullish(periodJournal) && !entry.migrated;

  return (
    <RecordActions
      record={entry}
      items={
        <>
          <DropdownMenuItem
            render={
              <Link
                to={AccountingPath.create({
                  organizationId: organization.id,
                }).to({
                  path: `/journal/${entry.id}`,
                })}
              />
            }
          >
            {i18n.core.action.open}
          </DropdownMenuItem>
          <WriteGuard>
            {editable && (
              <>
                <DropdownMenuItem
                  render={
                    <Link
                      to={AccountingPath.create({
                        organizationId: organization.id,
                      }).to({
                        path: `/journal/${entry.id}/edit`,
                      })}
                    />
                  }
                >
                  {i18n.core.action.edit}
                </DropdownMenuItem>
                <DropdownMenuItem
                  render={
                    <Link
                      to={AccountingPath.create({
                        organizationId: organization.id,
                      }).to({
                        path: `/journal/${entry.id}/duplicate`,
                      })}
                    />
                  }
                >
                  {i18n.journal.action.duplicate}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
                  {i18n.core.action.delete}
                </DropdownMenuItem>
              </>
            )}
          </WriteGuard>
        </>
      }
    >
      {editable && (
        <DeleteJournalEntry entry={entry} open={deleteOpen} onOpenChange={setDeleteOpen} />
      )}
    </RecordActions>
  );
};
