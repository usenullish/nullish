import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup } from "~/ui/components/field";
import { DocumentTemplateFields } from "~/components/settings/document-templates/form/document-template-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const DocumentTemplateEditForm = ({
  onAction,
  pending,
  template,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
  template: Api["DocumentTemplates"]["Client"]["DocumentTemplate"];
}) => {
  const { i18n } = useI18n();

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <input type="hidden" name="version" value={template.version} />

      <FieldGroup>
        <h1 className="text-xs font-medium">{i18n.document_templates.text.edit_title}</h1>

        <DocumentTemplateFields template={template} />

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.core.state.saving : i18n.core.action.save}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
