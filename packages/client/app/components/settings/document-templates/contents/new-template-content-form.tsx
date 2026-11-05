import { Button } from "~/ui/components/button";
import { Field, FieldGroup } from "~/ui/components/field";
import { TemplateContentFields } from "~/components/settings/document-templates/contents/template-content-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const NewTemplateContentForm = ({
  onAction,
  pending,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
}) => {
  const { i18n } = useI18n();

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <FieldGroup>
        <h1 className="text-xs font-medium">{i18n.template_contents.action.add}</h1>

        <TemplateContentFields />

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.template_contents.state.creating : i18n.template_contents.action.add}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
