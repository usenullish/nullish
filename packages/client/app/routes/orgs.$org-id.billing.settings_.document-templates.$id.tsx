import type { Route } from "./+types/orgs.$org-id.billing.settings_.document-templates.$id";
import { isNullish } from "@usenullish/nullish-common";
import { Navigate, Outlet } from "react-router";
import { NonNullishDocumentTemplateContext } from "~/context/contexts/document-template.context";
import { DocumentTemplatesServer } from "~/context/server/document-templates.server";
import { useOrganization } from "~/context/contexts/organization.context";

export const loader = async (args: Route.LoaderArgs) => {
  return DocumentTemplatesServer.create().getDocumentTemplate(args);
};

const DocumentTemplatePage = ({ loaderData }: Route.ComponentProps) => {
  const organization = useOrganization();
  const { template } = loaderData ?? { template: undefined };

  if (isNullish(template)) {
    return <Navigate to={`/orgs/${organization.id}`} replace />;
  }

  return (
    <NonNullishDocumentTemplateContext.Provider value={template}>
      <Outlet />
    </NonNullishDocumentTemplateContext.Provider>
  );
};

export default DocumentTemplatePage;
