import type { Route } from "./+types/orgs.$org-id.banking._index";
import { BankRelationSummariesServer } from "~/context/server/bank-relation-summaries.server";
import { Pagination } from "~/components/core/pagination";
import { BankRelationsTable } from "~/components/banking/list/bank-relations-table";

export const loader = async (args: Route.LoaderArgs) => {
  return await BankRelationSummariesServer.create().listBankRelationSummaries(args);
};

const BankPage = ({ loaderData }: Route.ComponentProps) => {
  const bankRelationSummaries = loaderData?.bankRelationSummaries ?? [];

  return (
    <div className="flex flex-col gap-4">
      <BankRelationsTable bankRelationSummaries={bankRelationSummaries} />

      <Pagination count={bankRelationSummaries.length} />
    </div>
  );
};

// /orgs/:orgId/bank
export default BankPage;
