import { useOrganization } from "~/context/contexts/organization.context";
import type { Route } from "../../.react-router/types/app/routes/+types/orgs.$org-id.banking.settings_.bank-relations.$id";
import { BankRelationsServer } from "~/context/server/bank-relations.server";
import { isNullish } from "@usenullish/nullish-common";
import { Navigate } from "react-router";
import { BankRelationEdit } from "~/components/settings/bank-relations/edit/bank-relation-edit";
import type { RouteHandle } from "~/kit/router/route-handle";
import { BankingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) =>
      BankingPath.create({ organizationId }).toSettings({ path: "/bank-relations" }),
    label: ({ i18n }) => i18n.bank_relations.text.edit_title,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  return BankRelationsServer.create().getBankRelation(args);
};

const BankRelationPage = ({ loaderData }: Route.ComponentProps) => {
  const { id: organizationId } = useOrganization();
  const { bankRelation } = loaderData ?? { bankRelation: undefined };

  if (isNullish(bankRelation)) {
    return <Navigate to={`/orgs/${organizationId}`} replace />;
  }

  return <BankRelationEdit organizationId={organizationId} bankRelation={bankRelation} />;
};

// /orgs/:orgId/banking/settings/bank-relations/:id
export default BankRelationPage;
