import { useId } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { VAT_NUMBER_REGEX } from "@usenullish/nullish-common";
import { ClientType } from "@usenullish/nullish-schema/db";
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

export const ClientFields = ({
  client,
}: {
  client?: NonNullable<Api["Clients"]["Client"]["GetClientResponse"]["client"]>;
}) => {
  const { i18n } = useI18n();
  const typeId = useId();
  const nameId = useId();
  const vatNumberId = useId();

  const types = Object.values(ClientType).map((value) => ({
    value,
    label: i18n.clients.type[value],
  }));

  return (
    <>
      <Field>
        <FieldLabel htmlFor={typeId}>{i18n.core.label.type}</FieldLabel>
        <Select
          items={types}
          name="type"
          defaultValue={client?.type ?? ClientType.COMPANY}
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
        <FieldLabel htmlFor={nameId}>
          {i18n.core.label.name} <span aria-hidden="true">*</span>
        </FieldLabel>
        <Input id={nameId} name="name" defaultValue={client?.name} required />
      </Field>

      <Field>
        <FieldLabel htmlFor={vatNumberId}>{i18n.vat.label.number}</FieldLabel>
        <Input
          id={vatNumberId}
          name="vatNumber"
          pattern={VAT_NUMBER_REGEX.source}
          placeholder={i18n.vat.label.number_placeholder}
          defaultValue={client?.vatNumber ?? undefined}
        />
      </Field>

      <AddressFields values={client} />

      <CommunicationFields values={client} />
    </>
  );
};
