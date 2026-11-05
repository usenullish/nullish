import { useState } from "react";
import { Link } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { DropdownMenuItem } from "~/ui/components/dropdown-menu";
import { RecordActions } from "~/components/core/record-actions";
import { DeleteTemplateContent } from "~/components/settings/document-templates/contents/delete-template-content";
import { useOrganization } from "~/context/contexts/organization.context";
import { BillingPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const TemplateContentActions = ({
  content,
  templateId,
}: {
  content: Api["TemplateContents"]["Client"]["TemplateContent"];
  templateId: Api["DocumentTemplates"]["Client"]["DocumentTemplate"]["id"];
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <RecordActions
      record={content}
      items={
        <>
          <WriteGuard>
            <DropdownMenuItem
              render={
                <Link
                  to={BillingPath.create({
                    organizationId: organization.id,
                  }).toSettings({
                    path: `/document-templates/${templateId}/contents/${content.id}/edit`,
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
      <DeleteTemplateContent content={content} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </RecordActions>
  );
};
