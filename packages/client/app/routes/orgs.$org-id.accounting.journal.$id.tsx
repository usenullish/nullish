import type { Route } from "./+types/orgs.$org-id.accounting.journal.$id";
import { isNullish } from "@usenullish/nullish-common";
import { Navigate, Outlet } from "react-router";
import { NonNullishJournalEntryContext } from "~/context/contexts/journal-entry.context";
import { JournalSummariesServer } from "~/context/server/journal-summaries.server";
import { useOrganization } from "~/context/contexts/organization.context";

export const loader = async (args: Route.LoaderArgs) => {
  return JournalSummariesServer.create().getJournalSummary(args);
};

const JournalEntryPage = ({ loaderData }: Route.ComponentProps) => {
  const organization = useOrganization();
  const { journalSummary } = loaderData ?? { journalSummary: undefined };

  if (isNullish(journalSummary)) {
    return <Navigate to={`/orgs/${organization.id}`} replace />;
  }

  return (
    <NonNullishJournalEntryContext.Provider value={journalSummary}>
      <Outlet />
    </NonNullishJournalEntryContext.Provider>
  );
};

export default JournalEntryPage;
