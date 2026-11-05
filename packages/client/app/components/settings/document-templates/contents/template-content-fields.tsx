import { useId } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { Field, FieldDescription, FieldLabel } from "~/ui/components/field";
import { LanguageCombobox } from "~/components/core/language-combobox";
import { FileInput } from "~/components/core/file-input";
import { useI18n } from "~/kit/i18n/i18n.context";

export const TemplateContentFields = ({
  content,
}: {
  content?: Api["TemplateContents"]["Client"]["TemplateContent"];
}) => {
  const { i18n } = useI18n();
  const languageId = useId();
  const htmlId = useId();

  return (
    <>
      <Field>
        <FieldLabel htmlFor={languageId}>{i18n.core.label.language}</FieldLabel>
        <LanguageCombobox
          id={languageId}
          name="language"
          defaultValue={content?.language ?? null}
          required
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={htmlId}>{i18n.document_templates.label.html}</FieldLabel>
        <FileInput
          id={htmlId}
          name="html"
          accept=".html,text/html"
          required={content === undefined}
        />
        {content !== undefined && (
          <FieldDescription>{i18n.document_templates.text.keep_current}</FieldDescription>
        )}
      </Field>
    </>
  );
};
