import type { Route } from "./+types/orgs.$org-id.billing.settings_.document-templates.$id.contents.$content-id.edit";
import { isNullish } from "@usenullish/nullish-common";
import { Navigate } from "react-router";
import { TemplateContentEdit } from "~/components/settings/document-templates/contents/template-content-edit";
import { TemplateContentsServer } from "~/context/server/document-templates+contents.server";
import { useDocumentTemplate } from "~/context/contexts/document-template.context";
import { useOrganization } from "~/context/contexts/organization.context";
import { BillingPath } from "~/navigation";
import type { RouteHandle } from "~/kit/router/route-handle";

export const handle: RouteHandle = {
  permission: { write: true },
  breadcrumb: {
    back: ({ organizationId, params }) =>
      BillingPath.create({ organizationId }).toSettings({
        path: `/document-templates/${params.id ?? ""}`,
      }),
    label: ({ i18n }) => i18n.template_contents.text.edit_title,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  return await TemplateContentsServer.create().getContent(args);
};

const TemplateContentEditPage = ({ loaderData }: Route.ComponentProps) => {
  const organization = useOrganization();
  const template = useDocumentTemplate();

  const templatePath = BillingPath.create({
    organizationId: organization.id,
  }).toSettings({ path: `/document-templates/${template.id}` });

  const content = loaderData?.content;

  if (isNullish(content)) {
    return <Navigate to={templatePath} replace />;
  }

  return <TemplateContentEdit content={content} templatePath={templatePath} />;
};

// /orgs/:orgId/billing/settings/document-templates/:id/contents/:contentId/edit
export default TemplateContentEditPage;
