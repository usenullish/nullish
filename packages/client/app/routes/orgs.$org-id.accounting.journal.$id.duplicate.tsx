import type { Route } from "./+types/orgs.$org-id.accounting.journal.$id.duplicate";
import { NewJournal } from "~/components/journal/new/new-journal";
import { useJournalEntry } from "~/context/contexts/journal-entry.context";
import { useOrganization } from "~/context/contexts/organization.context";
import type { RouteHandle } from "~/kit/router/route-handle";
import { loadVatAndPeriod } from "~/context/loaders/vat-period.loader.server";
import { AccountingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId, params }) =>
      AccountingPath.create({ organizationId }).to({ path: `/journal/${params.id ?? ""}` }),
    label: ({ i18n }) => i18n.journal.text.new,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  return await loadVatAndPeriod(args);
};

const JournalDuplicatePage = ({ loaderData }: Route.ComponentProps) => {
  const { id: organizationId } = useOrganization();
  const journalEntry = useJournalEntry();

  return (
    <NewJournal
      organizationId={organizationId}
      template={journalEntry}
      vatRates={loaderData.rates?.rates ?? []}
      vatMethods={loaderData.methods?.methods ?? []}
      periods={loaderData.periods?.periods ?? []}
    />
  );
};

// /orgs/:orgId/journal/:id/duplicate
export default JournalDuplicatePage;
