import type { Route } from "./+types/orgs.$org-id.accounting.journal.new";
import { NewJournal } from "~/components/journal/new/new-journal";
import { useOrganization } from "~/context/contexts/organization.context";
import type { RouteHandle } from "~/kit/router/route-handle";
import { loadVatAndPeriod } from "~/context/loaders/vat-period.loader.server";
import { AccountingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) =>
      AccountingPath.create({ organizationId }).to({ path: "/journal" }),
    label: ({ i18n }) => i18n.journal.text.new,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  return await loadVatAndPeriod(args);
};

const NewJournalPage = ({ loaderData }: Route.ComponentProps) => {
  const { id: organizationId } = useOrganization();

  return (
    <NewJournal
      organizationId={organizationId}
      vatRates={loaderData.rates?.rates ?? []}
      vatMethods={loaderData.methods?.methods ?? []}
      periods={loaderData.periods?.periods ?? []}
    />
  );
};

// /orgs/:orgId/journal/new
export default NewJournalPage;
