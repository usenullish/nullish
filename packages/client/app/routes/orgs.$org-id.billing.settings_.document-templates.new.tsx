import { useOrganization } from "~/context/contexts/organization.context";
import { NewDocumentTemplate } from "~/components/settings/document-templates/new/new-document-template";
import type { RouteHandle } from "~/kit/router/route-handle";
import { BillingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId }) =>
      BillingPath.create({ organizationId }).toSettings({ path: "/document-templates" }),
    label: ({ i18n }) => i18n.document_templates.text.create_title,
  },
};

const NewDocumentTemplatePage = () => {
  const { id: organizationId } = useOrganization();

  return <NewDocumentTemplate organizationId={organizationId} />;
};

// /orgs/:orgId/billing/settings/document-templates/new
export default NewDocumentTemplatePage;
