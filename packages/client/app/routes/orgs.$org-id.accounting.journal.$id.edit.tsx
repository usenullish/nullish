import type { Route } from "./+types/orgs.$org-id.accounting.journal.$id.edit";
import { JournalEdit } from "~/components/journal/edit/journal-edit";
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
    label: ({ i18n }) => i18n.journal.text.edit_title,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  return await loadVatAndPeriod(args);
};

const JournalEditPage = ({ loaderData }: Route.ComponentProps) => {
  const { id: organizationId } = useOrganization();
  const journalEntry = useJournalEntry();

  return (
    <JournalEdit
      organizationId={organizationId}
      journalEntry={journalEntry}
      vatRates={loaderData.rates?.rates ?? []}
      vatMethods={loaderData.methods?.methods ?? []}
      periods={loaderData.periods?.periods ?? []}
    />
  );
};

// /orgs/:orgId/journal/:id/edit
export default JournalEditPage;
