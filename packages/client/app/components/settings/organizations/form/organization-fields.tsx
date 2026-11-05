import { useId } from "react";
import { isNullish } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { LegalForm } from "@usenullish/nullish-schema/db";
import { Field, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/components/select";
import { AddressFields } from "~/components/core/address-fields";
import { CommunicationFields } from "~/components/core/communication-fields";
import { useI18n } from "~/kit/i18n/i18n.context";

export const OrganizationFields = ({
  organization,
}: {
  organization?: Api["Organizations"]["Client"]["Organization"];
}) => {
  const { i18n } = useI18n();
  const id = useId();

  const fieldId = (name: string) => `${id}-${name}`;

  const legalFormLabels: Record<LegalForm, string> = {
    [LegalForm.LLC]: i18n.organizations.label.legal_form_llc,
    [LegalForm.CORPORATION]: i18n.organizations.label.legal_form_corporation,
    [LegalForm.SOLE_PROPRIETORSHIP]: i18n.organizations.label.legal_form_sole_proprietorship,
  };

  const legalForms = Object.values(LegalForm).map((value) => ({
    value,
    label: legalFormLabels[value],
  }));

  return (
    <>
      <Field>
        <FieldLabel htmlFor={fieldId("name")}>
          {i18n.core.label.name} <span aria-hidden="true">*</span>
        </FieldLabel>
        <Input
          id={fieldId("name")}
          name="name"
          autoComplete="organization"
          defaultValue={organization?.name}
          required
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={fieldId("legalForm")}>
          {i18n.organizations.label.legal_form}
        </FieldLabel>
        {isNullish(organization) ? (
          <Select items={legalForms} name="legalForm" defaultValue={LegalForm.LLC} required>
            <SelectTrigger id={fieldId("legalForm")} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {legalForms.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input
            id={fieldId("legalForm")}
            value={legalFormLabels[organization.legalForm]}
            disabled
            readOnly
          />
        )}
      </Field>

      <AddressFields values={organization} />

      <CommunicationFields values={organization} />
    </>
  );
};
