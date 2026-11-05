import type { Route } from "./+types/orgs.$org-id.billing.settings.document-templates._index";
import { DocumentTemplatesServer } from "~/context/server/document-templates.server";
import { Link } from "react-router";
import { Plus } from "lucide-react";
import { useOrganization } from "~/context/contexts/organization.context";
import { Pagination } from "~/components/core/pagination";
import { FilterSelect, ListFilters } from "~/components/core/list-filters";
import { DocumentTemplatesTable } from "~/components/settings/document-templates/list/document-templates-table";
import { Button } from "~/ui/components/button";
import { DocumentType } from "@usenullish/nullish-schema/db";
import { BillingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const loader = async (args: Route.LoaderArgs) => {
  return await DocumentTemplatesServer.create().listDocumentTemplates(args);
};

const OrganizationDocumentTemplatesPage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const organization = useOrganization();

  const templates = loaderData?.templates ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ListFilters>
          <FilterSelect
            name="type"
            label={i18n.core.label.type}
            options={Object.values(DocumentType).map((value) => ({
              value,
              label: i18n.document_templates.type[value],
            }))}
          />
        </ListFilters>

        <WriteGuard>
          <Button
            nativeButton={false}
            render={
              <Link
                to={BillingPath.create({
                  organizationId: organization.id,
                }).toSettings({ path: "/document-templates/new" })}
              />
            }
          >
            <Plus />
            {i18n.document_templates.action.create}
          </Button>
        </WriteGuard>
      </div>

      <DocumentTemplatesTable templates={templates} />

      <Pagination count={templates.length} />
    </div>
  );
};

export default OrganizationDocumentTemplatesPage;
