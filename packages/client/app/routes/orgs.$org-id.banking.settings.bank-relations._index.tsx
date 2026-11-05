import type { Route } from "./+types/orgs.$org-id.banking.settings.bank-relations._index";
import { BankRelationsServer } from "~/context/server/bank-relations.server";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useOrganization } from "~/context/contexts/organization.context";
import { Pagination } from "~/components/core/pagination";
import { BankRelationsTable } from "~/components/settings/bank-relations/list/bank-relations-table";
import { Button } from "~/ui/components/button";
import { BankingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const loader = async (args: Route.LoaderArgs) => {
  return await BankRelationsServer.create().listBankRelations(args);
};

const OrganizationBankRelationsPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  const bankRelations = loaderData?.bankRelations ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <WriteGuard>
          <Button
            nativeButton={false}
            render={
              <Link
                to={BankingPath.create({
                  organizationId: organization.id,
                }).toSettings({ path: "/bank-relations/new" })}
              />
            }
          >
            <Plus />
            {i18n.bank_relations.action.create}
          </Button>
        </WriteGuard>
      </div>

      <BankRelationsTable bankRelations={bankRelations} />

      <Pagination count={bankRelations.length} />
    </div>
  );
};

export default OrganizationBankRelationsPage;
