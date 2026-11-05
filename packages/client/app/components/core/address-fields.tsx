import { useId } from "react";
import type { Nullable } from "@usenullish/nullish-common";
import { Field, FieldLabel, FieldLegend, FieldSet } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import { CountryCombobox } from "~/components/core/country-combobox";
import { useI18n } from "~/kit/i18n/i18n.context";

export interface AddressValues {
  careOf: Nullable<string>;
  address: Nullable<string>;
  postalCode: Nullable<string>;
  city: Nullable<string>;
  country: Nullable<string>;
}

export const AddressFields = ({ values }: { values?: AddressValues }) => {
  const { i18n } = useI18n();
  const id = useId();

  const fieldId = (name: string) => `${id}-${name}`;

  return (
    <FieldSet className="mt-4">
      <FieldLegend>{i18n.organizations.label.address}</FieldLegend>

      <Field>
        <FieldLabel htmlFor={fieldId("careOf")}>{i18n.organizations.label.care_of}</FieldLabel>
        <Input id={fieldId("careOf")} name="careOf" defaultValue={values?.careOf ?? undefined} />
      </Field>

      <Field>
        <FieldLabel htmlFor={fieldId("address")}>{i18n.organizations.label.street}</FieldLabel>
        <Input
          id={fieldId("address")}
          name="address"
          autoComplete="street-address"
          defaultValue={values?.address ?? undefined}
        />
      </Field>

      <div className="grid grid-cols-[1fr_2fr] gap-4">
        <Field>
          <FieldLabel htmlFor={fieldId("postalCode")}>
            {i18n.organizations.label.postal_code}
          </FieldLabel>
          <Input
            id={fieldId("postalCode")}
            name="postalCode"
            autoComplete="postal-code"
            defaultValue={values?.postalCode ?? undefined}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={fieldId("city")}>{i18n.organizations.label.city}</FieldLabel>
          <Input
            id={fieldId("city")}
            name="city"
            autoComplete="address-level2"
            defaultValue={values?.city ?? undefined}
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={fieldId("country")}>{i18n.organizations.label.country}</FieldLabel>
        <CountryCombobox
          id={fieldId("country")}
          name="country"
          defaultValue={values?.country ?? null}
        />
      </Field>
    </FieldSet>
  );
};
