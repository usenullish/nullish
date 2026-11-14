import { useId, useState } from "react";
import { type Nullable } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "~/ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/components/select";
import { useBillingSettings } from "~/context/contexts/billing-settings.context";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useDefaultTemplateLanguages, useFormatLanguage } from "~/kit/format/language.hooks";
import { DEFAULT_TEMPLATE } from "~/context/constants/templates.constants";
import { buildFormSubmit } from "~/kit/utils/form.utils";

export const PdfInvoiceForm = ({
  onAction,
  pending,
  templates,
  contents,
  language,
  bankRelations,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
  templates: Api["DocumentTemplates"]["Client"]["GetDocumentTemplatesResponse"]["templates"];
  contents: Api["TemplateContents"]["Client"]["GetTemplateContentsResponse"]["contents"];
  language: Api["TemplateContents"]["Client"]["TemplateContent"]["language"];
  bankRelations: Api["BankRelations"]["Client"]["GetBankRelationsResponse"]["bankRelations"];
}) => {
  const { i18n } = useI18n();
  const billingSettings = useBillingSettings();
  const formatLanguage = useFormatLanguage();
  const defaultLanguages = useDefaultTemplateLanguages();
  const templateId = useId();
  const contentId = useId();
  const bankRelationId = useId();

  const [selectedTemplateId, setSelectedTemplateId] = useState<
    Nullable<Api["DocumentTemplates"]["Client"]["DocumentTemplate"]["id"] | typeof DEFAULT_TEMPLATE>
  >(
    templates.length === 0
      ? DEFAULT_TEMPLATE
      : templates.length === 1
        ? (templates[0]?.id ?? null)
        : null,
  );

  const isDefaultTemplate = selectedTemplateId === DEFAULT_TEMPLATE;

  const items = [
    { value: DEFAULT_TEMPLATE, label: i18n.invoices.label.default_template },
    ...templates.map(({ id, name }) => ({ value: id, label: name })),
  ];

  const templateContents = contents.filter((content) => content.templateId === selectedTemplateId);

  const contentItems = isDefaultTemplate
    ? defaultLanguages
    : templateContents.map((content) => ({
        value: content.id,
        label: formatLanguage(content.language),
      }));

  const defaultContentId = isDefaultTemplate
    ? (contentItems.find(({ value }) => value === language)?.value ?? null)
    : (templateContents.find((content) => content.language === language)?.id ??
      (templateContents.length === 1 ? (templateContents[0]?.id ?? null) : null));

  const bankRelationItems = [
    { value: null, label: i18n.billing.label.no_bank_relation },
    ...bankRelations.map(({ id, name }) => ({ value: id, label: name })),
  ];

  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={templateId}>{i18n.invoices.label.document_template}</FieldLabel>
          <Select
            items={items}
            name="template"
            value={selectedTemplateId}
            onValueChange={(value: Nullable<string>) => setSelectedTemplateId(value)}
            required
          >
            <SelectTrigger id={templateId} className="w-full">
              <SelectValue placeholder={i18n.invoices.label.select_template} />
            </SelectTrigger>
            <SelectContent>
              {items.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor={contentId}>{i18n.core.label.language}</FieldLabel>
          <Select
            key={selectedTemplateId}
            items={contentItems}
            name={isDefaultTemplate ? "language" : "templateId"}
            defaultValue={defaultContentId}
            required
          >
            <SelectTrigger id={contentId} className="w-full">
              <SelectValue placeholder={i18n.invoices.label.select_language} />
            </SelectTrigger>
            <SelectContent>
              {contentItems.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor={bankRelationId}>{i18n.invoices.label.bank_relation}</FieldLabel>
          <Select
            items={bankRelationItems}
            name="bankRelationId"
            defaultValue={billingSettings?.bankRelationId ?? null}
          >
            <SelectTrigger id={bankRelationId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {bankRelationItems.map(({ value, label }) => (
                <SelectItem key={value ?? ""} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.invoices.state.generating : i18n.invoices.action.generate_pdf}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
