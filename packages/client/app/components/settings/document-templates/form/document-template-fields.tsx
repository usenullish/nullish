import { useId } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { DocumentType } from "@usenullish/nullish-schema/db";
import { Field, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/components/select";
import { useI18n } from "~/kit/i18n/i18n.context";

export const DocumentTemplateFields = ({
  template,
}: {
  template?: Api["DocumentTemplates"]["Client"]["DocumentTemplate"];
}) => {
  const { i18n } = useI18n();
  const typeId = useId();
  const nameId = useId();

  const types = Object.values(DocumentType).map((value) => ({
    value,
    label: i18n.document_templates.type[value],
  }));

  return (
    <>
      <Field>
        <FieldLabel htmlFor={typeId}>{i18n.core.label.type}</FieldLabel>
        <Select
          items={types}
          name="type"
          defaultValue={template?.type ?? DocumentType.INVOICE}
          required
        >
          <SelectTrigger id={typeId} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {types.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field>
        <FieldLabel htmlFor={nameId}>{i18n.core.label.name}</FieldLabel>
        <Input id={nameId} name="name" defaultValue={template?.name} required />
      </Field>
    </>
  );
};
