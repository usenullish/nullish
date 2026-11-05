import type { Route } from "./+types/orgs.$org-id.accounting.journal._index";
import { JournalSummariesServer } from "~/context/server/journal-summaries.server";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useOrganization } from "~/context/contexts/organization.context";
import { Pagination } from "~/components/core/pagination";
import { FilterDate, FilterText, ListFilters } from "~/components/core/list-filters";
import { JournalTable } from "~/components/journal/list/journal-table";
import { Button } from "~/ui/components/button";
import { AccountingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const loader = async (args: Route.LoaderArgs) => {
  return await JournalSummariesServer.create().listJournalSummaries(args);
};

// /orgs/:orgId/journal
const JournalPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  const journalSummaries = loaderData?.journalSummaries ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ListFilters>
          <FilterText name="number" label={i18n.core.label.number} numeric />
          <FilterDate name="validOnFrom" label={i18n.journal.label.valid_from} />
          <FilterDate name="validOnTo" label={i18n.journal.label.valid_to} />
          <FilterText name="reference" label={i18n.core.label.reference} />
        </ListFilters>

        <WriteGuard>
          <Button
            nativeButton={false}
            render={
              <Link
                to={AccountingPath.create({ organizationId: organization.id }).to({
                  path: "/journal/new",
                })}
              />
            }
          >
            <Plus />
            {i18n.journal.action.create}
          </Button>
        </WriteGuard>
      </div>

      <JournalTable journalSummaries={journalSummaries} />

      <Pagination count={journalSummaries.length} />
    </div>
  );
};

export default JournalPage;
