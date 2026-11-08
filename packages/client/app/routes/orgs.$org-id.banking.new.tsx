import { useOrganization } from "~/context/contexts/organization.context";
import { NewBankRelation } from "~/components/banking/new/new-bank-relation";
import type { RouteHandle } from "~/kit/router/route-handle";
import { BankingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) => BankingPath.create({ organizationId }).to(),
    label: ({ i18n }) => i18n.bank_relations.text.create_title,
  },
};

const NewBankRelationPage = () => {
  const { id: organizationId } = useOrganization();

  return <NewBankRelation organizationId={organizationId} />;
};

// /orgs/:orgId/banking/new
export default NewBankRelationPage;
