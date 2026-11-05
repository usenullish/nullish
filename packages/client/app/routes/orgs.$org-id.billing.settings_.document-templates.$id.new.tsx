import { NewTemplateContent } from "~/components/settings/document-templates/contents/new-template-content";
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
    label: ({ i18n }) => i18n.template_contents.action.add,
  },
};

const NewTemplateContentPage = () => {
  const { id: organizationId } = useOrganization();
  const { id: templateId } = useDocumentTemplate();

  return <NewTemplateContent organizationId={organizationId} templateId={templateId} />;
};

// /orgs/:orgId/billing/settings/document-templates/:id/new
export default NewTemplateContentPage;
