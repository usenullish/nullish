import type { Route } from "./+types/orgs.$org-id.banking.$id_.movements.$movement-id";
import { isNullish } from "@usenullish/nullish-common";
import { Navigate } from "react-router";
import { BankMovementsServer } from "~/context/server/bank-movements.server";
import { MovementDetails } from "~/components/banking/movements/movement-details";
import { useOrganization } from "~/context/contexts/organization.context";
import { BankingPath } from "~/navigation";
import type { BreadcrumbHandle } from "~/kit/router/route-handle";

export const handle: BreadcrumbHandle = {
  breadcrumb: {
    back: ({ organizationId, params }) =>
      BankingPath.create({ organizationId }).to({ path: `/${params.id ?? ""}` }),
    label: ({ i18n }) => i18n.bank_movements.text.details,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  return await BankMovementsServer.create().getMovement(args);
};

const BankMovementPage = ({ loaderData, params }: Route.ComponentProps) => {
  const organization = useOrganization();

  const bankMovement = loaderData?.bankMovement;

  if (isNullish(bankMovement)) {
    return (
      <Navigate
        to={BankingPath.create({ organizationId: organization.id }).to({
          path: `/${params.id}`,
        })}
        replace
      />
    );
  }

  return <MovementDetails movement={bankMovement} />;
};

// /orgs/:orgId/bank/:id/movements/:movementId
export default BankMovementPage;
