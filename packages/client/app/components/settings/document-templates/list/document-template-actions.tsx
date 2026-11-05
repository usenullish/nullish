import { useState } from "react";
import { Link } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { DropdownMenuItem } from "~/ui/components/dropdown-menu";
import { RecordActions } from "~/components/core/record-actions";
import { DeleteDocumentTemplate } from "~/components/settings/document-templates/delete/delete-document-template";
import { useOrganization } from "~/context/contexts/organization.context";
import { BillingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const DocumentTemplateActions = ({
  template,
}: {
  template: Api["DocumentTemplates"]["Client"]["DocumentTemplate"];
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <RecordActions
      record={template}
      items={
        <>
          <DropdownMenuItem
            render={
              <Link
                to={BillingPath.create({
                  organizationId: organization.id,
                }).toSettings({
                  path: `/document-templates/${template.id}`,
                })}
              />
            }
          >
            {i18n.core.action.open}
          </DropdownMenuItem>
          <WriteGuard>
            <DropdownMenuItem
              render={
                <Link
                  to={BillingPath.create({
                    organizationId: organization.id,
                  }).toSettings({
                    path: `/document-templates/${template.id}/edit`,
                  })}
                />
              }
            >
              {i18n.core.action.edit}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
              {i18n.core.action.delete}
            </DropdownMenuItem>
          </WriteGuard>
        </>
      }
    >
      <DeleteDocumentTemplate template={template} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </RecordActions>
  );
};
