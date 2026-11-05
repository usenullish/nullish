import { useState } from "react";
import { Link, useNavigate } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { useOrganization } from "~/context/contexts/organization.context";
import { BillingPath } from "~/navigation";
import { DeleteDocumentTemplate } from "~/components/settings/document-templates/delete/delete-document-template";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const DocumentTemplateDetails = ({
  template,
}: {
  template: Api["DocumentTemplates"]["Client"]["DocumentTemplate"];
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const rows = [
    { label: i18n.core.label.type, value: i18n.document_templates.type[template.type] },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xs font-medium">{template.name}</h1>

        <div className="flex flex-wrap gap-2">
          <WriteGuard>
            <Button
              variant="outline"
              nativeButton={false}
              render={
                <Link
                  to={BillingPath.create({
                    organizationId: organization.id,
                  }).toSettings({ path: `/document-templates/${template.id}/edit` })}
                />
              }
            >
              {i18n.core.action.edit}
            </Button>

            <Button variant="outline" onClick={() => setDeleteOpen(true)}>
              {i18n.core.action.delete}
            </Button>
          </WriteGuard>
        </div>

        <DeleteDocumentTemplate
          template={template}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          onDeleted={async () => {
            await navigate(
              BillingPath.create({ organizationId: organization.id }).toSettings({
                path: "/document-templates",
              }),
            );
          }}
        />
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
        {rows.map(({ label, value }) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};
