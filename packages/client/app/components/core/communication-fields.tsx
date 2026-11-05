import { useId } from "react";
import type { Nullable } from "@usenullish/nullish-common";
import { Field, FieldLabel, FieldLegend, FieldSet } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import { LanguageCombobox } from "~/components/core/language-combobox";
import { useI18n } from "~/kit/i18n/i18n.context";

export const EMAIL_PLACEHOLDER = "name@example.com";
export const PHONE_PLACEHOLDER = "+41791234567";
const WEBSITE_PLACEHOLDER = "https://example.com";

export interface CommunicationValues {
  email: Nullable<string>;
  phone: Nullable<string>;
  website: Nullable<string>;
  language: Nullable<string>;
}

export const CommunicationFields = ({ values }: { values?: CommunicationValues }) => {
  const { i18n } = useI18n();
  const id = useId();

  const fieldId = (name: string) => `${id}-${name}`;

  return (
    <FieldSet className="mt-4">
      <FieldLegend>{i18n.organizations.label.communication}</FieldLegend>

      <Field>
        <FieldLabel htmlFor={fieldId("language")}>{i18n.core.label.language}</FieldLabel>
        <LanguageCombobox
          id={fieldId("language")}
          name="language"
          defaultValue={values?.language ?? null}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={fieldId("email")}>{i18n.core.label.email}</FieldLabel>
        <Input
          id={fieldId("email")}
          name="email"
          type="email"
          autoComplete="email"
          placeholder={EMAIL_PLACEHOLDER}
          defaultValue={values?.email ?? undefined}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={fieldId("phone")}>{i18n.core.label.phone}</FieldLabel>
        <Input
          id={fieldId("phone")}
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder={PHONE_PLACEHOLDER}
          defaultValue={values?.phone ?? undefined}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={fieldId("website")}>{i18n.organizations.label.website}</FieldLabel>
        <Input
          id={fieldId("website")}
          name="website"
          type="url"
          autoComplete="url"
          placeholder={WEBSITE_PLACEHOLDER}
          defaultValue={values?.website ?? undefined}
        />
      </Field>
    </FieldSet>
  );
};
