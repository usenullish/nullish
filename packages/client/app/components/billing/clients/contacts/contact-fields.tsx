import { useId } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { Field, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import { EMAIL_PLACEHOLDER, PHONE_PLACEHOLDER } from "~/components/core/communication-fields";
import { useI18n } from "~/kit/i18n/i18n.context";

export const ContactFields = ({
  contact,
}: {
  contact?: NonNullable<Api["Contacts"]["Client"]["GetContactResponse"]["contact"]>;
}) => {
  const { i18n } = useI18n();
  const lastNameId = useId();
  const firstNameId = useId();
  const emailId = useId();
  const phoneId = useId();

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor={firstNameId}>{i18n.contacts.label.first_name}</FieldLabel>
          <Input
            id={firstNameId}
            name="firstName"
            autoComplete="given-name"
            defaultValue={contact?.firstName ?? undefined}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={lastNameId}>
            {i18n.contacts.label.last_name} <span aria-hidden="true">*</span>
          </FieldLabel>
          <Input
            id={lastNameId}
            name="lastName"
            autoComplete="family-name"
            defaultValue={contact?.lastName}
            required
          />
        </Field>
      </div>

      <Field>
        <FieldLabel htmlFor={emailId}>{i18n.core.label.email}</FieldLabel>
        <Input
          id={emailId}
          name="email"
          type="email"
          autoComplete="email"
          placeholder={EMAIL_PLACEHOLDER}
          defaultValue={contact?.email ?? undefined}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor={phoneId}>{i18n.core.label.phone}</FieldLabel>
        <Input
          id={phoneId}
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder={PHONE_PLACEHOLDER}
          defaultValue={contact?.phone ?? undefined}
        />
      </Field>
    </>
  );
};
