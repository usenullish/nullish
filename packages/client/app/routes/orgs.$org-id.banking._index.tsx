import type { Route } from "./+types/orgs.$org-id.banking._index";
import { BankRelationSummariesServer } from "~/context/server/bank-relation-summaries.server";
import { Pagination } from "~/components/core/pagination";
import { BankRelationsTable } from "~/components/banking/list/bank-relations-table";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { Button } from "~/ui/components/button";
import { WriteGuard } from "~/components/auth/guards/write-guard";
import { useOrganization } from "~/context/contexts/organization.context";
import { BankingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";

export const loader = async (args: Route.LoaderArgs) => {
  return await BankRelationSummariesServer.create().listBankRelationSummaries(args);
};

const BankPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const bankRelationSummaries = loaderData?.bankRelationSummaries ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <WriteGuard>
          <Button
            nativeButton={false}
            render={
              <Link
                to={BankingPath.create({ organizationId: organization.id }).to({ path: "/new" })}
              />
            }
          >
            <Plus />
            {i18n.bank_relations.action.create}
          </Button>
        </WriteGuard>
      </div>

      <BankRelationsTable bankRelationSummaries={bankRelationSummaries} />

      <Pagination count={bankRelationSummaries.length} />
    </div>
  );
};

// /orgs/:orgId/bank
export default BankPage;
