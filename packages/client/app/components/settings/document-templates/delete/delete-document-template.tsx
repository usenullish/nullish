import type { Api } from "@usenullish/nullish-schema/server";
import { DeleteRecord } from "~/components/core/delete-record";
import { DocumentTemplatesService } from "~/lib/services/document-templates.services";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const DeleteDocumentTemplate = ({
  template,
  open,
  onOpenChange,
  onDeleted,
}: {
  template: Api["DocumentTemplates"]["Client"]["DocumentTemplate"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => Promise<void>;
}) => {
  const { i18n } = useI18n();

  return (
    <DeleteRecord
      delete={() => DocumentTemplatesService.create().delete({ templateId: template.id })}
      texts={{
        title: replacePlaceholders(i18n.document_templates.text.delete_title, {
          "{name}": template.name,
        }),
        description: i18n.document_templates.text.delete_description,
        success: i18n.document_templates.toast.delete_success,
        error: i18n.document_templates.toast.delete_error,
      }}
      open={open}
      onOpenChange={onOpenChange}
      onDeleted={onDeleted}
    />
  );
};
