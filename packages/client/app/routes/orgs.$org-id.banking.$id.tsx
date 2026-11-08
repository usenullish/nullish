import type { Route } from "./+types/orgs.$org-id.banking.$id";
import { Navigate } from "react-router";
import { isNullish } from "@usenullish/nullish-common";
import { BankMovementStatus } from "@usenullish/nullish-schema/db";
import { BankRelationsServer } from "~/context/server/bank-relations.server";
import { BankMovementsServer } from "~/context/server/bank-movements.server";
import { Pagination } from "~/components/core/pagination";
import { FilterDate, FilterSelect, ListFilters } from "~/components/core/list-filters";
import { MovementsTable } from "~/components/banking/movements/movements-table";
import { BankRelationDetails } from "~/components/banking/details/bank-relation-details";
import { BankingPath } from "~/navigation";
import type { BreadcrumbHandle } from "~/kit/router/route-handle";
import { useOrganization } from "~/context/contexts/organization.context";
import { useI18n } from "~/kit/i18n/i18n.context";

export const handle: BreadcrumbHandle = {
  breadcrumb: {
    back: ({ organizationId }) => BankingPath.create({ organizationId }).to(),
    label: ({ i18n }) => i18n.bank_relations.text.details,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  const [bankRelation, movements] = await Promise.all([
    BankRelationsServer.create().getBankRelation(args),
    BankMovementsServer.create().listMovementsByBankRelationId(args),
  ]);

  return { bankRelation, movements };
};

const BankMovementsPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  const bankRelation = loaderData.bankRelation?.bankRelation;
  const bankMovements = loaderData.movements?.bankMovements ?? [];

  if (isNullish(bankRelation)) {
    return <Navigate to={BankingPath.create({ organizationId: organization.id }).to()} replace />;
  }

  return (
    <div className="flex flex-col gap-8">
      <BankRelationDetails bankRelation={bankRelation} />

      <div className="flex flex-col gap-4">
        <h2 className="text-xs font-medium">{i18n.bank_movements.text.title}</h2>

        <ListFilters>
          <FilterSelect
            name="status"
            label={i18n.core.label.status}
            options={Object.values(BankMovementStatus).map((value) => ({
              value,
              label: i18n.bank_movements.status[value],
            }))}
          />
          <FilterDate name="bookedOnFrom" label={i18n.bank_movements.label.booked_from} />
          <FilterDate name="bookedOnTo" label={i18n.bank_movements.label.booked_to} />
        </ListFilters>

        <MovementsTable bankMovements={bankMovements} />

        <Pagination count={bankMovements.length} />
      </div>
    </div>
  );
};

// /orgs/:orgId/bank/:id
export default BankMovementsPage;
