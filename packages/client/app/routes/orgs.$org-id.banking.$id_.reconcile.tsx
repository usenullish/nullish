import type { Route } from "./+types/orgs.$org-id.banking.$id_.reconcile";
import { Navigate } from "react-router";
import { isNullish } from "@usenullish/nullish-common";
import { BankRelationsServer } from "~/context/server/bank-relations.server";
import { BankMovementSummariesServer } from "~/context/server/bank-movement-summaries.server";
import { ReconcileMovements } from "~/components/banking/reconcile/reconcile-movements";
import { Pagination } from "~/components/core/pagination";
import { BankingPath } from "~/navigation";
import type { RouteHandle } from "~/kit/router/route-handle";
import { useOrganization } from "~/context/contexts/organization.context";
import { loadVatAndPeriod } from "~/context/loaders/vat-period.loader.server";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId, params }) =>
      BankingPath.create({ organizationId }).to({
        path: `/${params.id ?? ""}?status=unreconciled`,
      }),
    label: ({ i18n }) => i18n.bank_movements.text.reconcile_title,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  const [bankRelation, summaries, { rates, methods, periods }] = await Promise.all([
    BankRelationsServer.create().getBankRelation(args),
    BankMovementSummariesServer.create().listUnreconciledSummariesByBankRelationId(args),
    loadVatAndPeriod(args),
  ]);

  return { bankRelation, summaries, rates, methods, periods };
};

const ReconcileMovementsPage = ({ loaderData }: Route.ComponentProps) => {
  const organization = useOrganization();

  const bankRelation = loaderData.bankRelation?.bankRelation;
  const bankMovementSummaries = loaderData.summaries?.bankMovementSummaries ?? [];

  if (isNullish(bankRelation)) {
    return <Navigate to={BankingPath.create({ organizationId: organization.id }).to()} replace />;
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 py-10">
      <ReconcileMovements
        bankRelation={bankRelation}
        bankMovementSummaries={bankMovementSummaries}
        vatRates={loaderData.rates?.rates ?? []}
        vatMethods={loaderData.methods?.methods ?? []}
        periods={loaderData.periods?.periods ?? []}
      />

      <Pagination count={bankMovementSummaries.length} />
    </div>
  );
};

// /orgs/:orgId/bank/:id/reconcile
export default ReconcileMovementsPage;
