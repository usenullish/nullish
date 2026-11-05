import { DocumentTemplateEdit } from "~/components/settings/document-templates/edit/document-template-edit";
import { useDocumentTemplate } from "~/context/contexts/document-template.context";
import { useOrganization } from "~/context/contexts/organization.context";
import type { RouteHandle } from "~/kit/router/route-handle";
import { BillingPath } from "~/navigation";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId, params }) =>
      BillingPath.create({ organizationId }).toSettings({
        path: `/document-templates/${params.id ?? ""}`,
      }),
    label: ({ i18n }) => i18n.document_templates.text.edit_title,
  },
};

const DocumentTemplateEditPage = () => {
  const { id: organizationId } = useOrganization();
  const template = useDocumentTemplate();

  return <DocumentTemplateEdit organizationId={organizationId} template={template} />;
};

// /orgs/:orgId/billing/settings/document-templates/:id/edit
export default DocumentTemplateEditPage;
