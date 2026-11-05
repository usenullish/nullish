import type { Api } from "@usenullish/nullish-schema/server";
import { DeleteRecord } from "~/components/core/delete-record";
import { TemplateContentsService } from "~/lib/services/document-templates+contents.services";
import { useI18n } from "~/kit/i18n/i18n.context";

export const DeleteTemplateContent = ({
  content,
  open,
  onOpenChange,
  onDeleted,
}: {
  content: Api["TemplateContents"]["Client"]["TemplateContent"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => Promise<void>;
}) => {
  const { i18n } = useI18n();

  return (
    <DeleteRecord
      delete={() => TemplateContentsService.create().delete({ id: content.id })}
      texts={{
        title: i18n.template_contents.text.delete_title,
        description: i18n.template_contents.text.delete_description,
        success: i18n.template_contents.toast.delete_success,
        error: i18n.template_contents.toast.delete_error,
      }}
      open={open}
      onOpenChange={onOpenChange}
      onDeleted={onDeleted}
    />
  );
};
