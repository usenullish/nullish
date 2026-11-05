import type { Route } from "./+types/orgs.$org-id.billing.settings_.document-templates.$id._index";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useOrganization } from "~/context/contexts/organization.context";
import { TemplateContentsServer } from "~/context/server/document-templates+contents.server";
import { useDocumentTemplate } from "~/context/contexts/document-template.context";
import { Pagination } from "~/components/core/pagination";
import { DocumentTemplateDetails } from "~/components/settings/document-templates/details/document-template-details";
import { TemplateContentActions } from "~/components/settings/document-templates/contents/template-content-actions";
import { Button } from "~/ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { BillingPath } from "~/navigation";
import type { BreadcrumbHandle } from "~/kit/router/route-handle";
import { useFormatLanguage } from "~/kit/format/language.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const handle: BreadcrumbHandle = {
  breadcrumb: {
    back: ({ organizationId }) =>
      BillingPath.create({ organizationId }).toSettings({ path: "/document-templates" }),
    label: ({ i18n }) => i18n.document_templates.text.details,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  return await TemplateContentsServer.create().listContentsByTemplateId(args);
};

// /orgs/:org-id/billing/settings/document-templates/:id
const DocumentTemplateDetailsPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const template = useDocumentTemplate();
  const organization = useOrganization();
  const formatLanguage = useFormatLanguage();

  const contents = loaderData?.contents ?? [];

  return (
    <div className="flex flex-col gap-8">
      <DocumentTemplateDetails template={template} />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-medium">{i18n.template_contents.text.title}</h2>

          <WriteGuard>
            <Button
              nativeButton={false}
              render={
                <Link
                  to={BillingPath.create({
                    organizationId: organization.id,
                  }).toSettings({ path: `/document-templates/${template.id}/new` })}
                />
              }
            >
              <Plus />
              {i18n.template_contents.action.add}
            </Button>
          </WriteGuard>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{i18n.core.label.language}</TableHead>
              <TableHead className="w-px" />
            </TableRow>
          </TableHeader>

          <TableBody>
            {contents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={2} className="text-muted-foreground">
                  {i18n.template_contents.text.empty}
                </TableCell>
              </TableRow>
            ) : (
              contents.map((content) => (
                <TableRow key={content.id}>
                  <TableCell>{formatLanguage(content.language)}</TableCell>
                  <TableCell className="w-px">
                    <TemplateContentActions content={content} templateId={template.id} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <Pagination count={contents.length} />
      </div>
    </div>
  );
};

export default DocumentTemplateDetailsPage;
