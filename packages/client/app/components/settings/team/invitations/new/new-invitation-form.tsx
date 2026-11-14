import { useId } from "react";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { Field, FieldGroup, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/components/select";
import { EMAIL_PLACEHOLDER } from "~/components/core/communication-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useDefaultTemplateLanguages } from "~/kit/format/language.hooks";
import { useSettings } from "~/context/contexts/settings.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";
import { testId } from "~/kit/tests/test.utils";
import { testIds } from "~/kit/tests/test-ids.constants";

const ROLES = ApiSchema.InvitationsCreate.CreateInvitationRequestSchema.shape.role.options;

export const NewInvitationForm = ({
  onAction,
  pending,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
}) => {
  const { i18n } = useI18n();
  const settings = useSettings();
  const languages = useDefaultTemplateLanguages();

  const emailId = useId();
  const roleId = useId();
  const languageId = useId();

  const roles = ROLES.map((role) => ({ value: role, label: i18n.team.role[role] }));
  return (
    <form onSubmit={buildFormSubmit({ onAction })} className="mx-auto w-full max-w-2xl py-10">
      <FieldGroup>
        <h1 className="text-xs font-medium">{i18n.invitations.text.create_title}</h1>

        <Field>
          <FieldLabel htmlFor={emailId}>{i18n.core.label.email}</FieldLabel>
          <Input
            id={emailId}
            name="email"
            type="email"
            autoComplete="off"
            placeholder={EMAIL_PLACEHOLDER}
            required
            {...testId(testIds.invitations.email)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={roleId}>{i18n.team.label.role}</FieldLabel>
          <Select items={roles} name="role" defaultValue="accountant" required>
            <SelectTrigger id={roleId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {settings?.mail.enabled === true && (
          <Field>
            <FieldLabel htmlFor={languageId}>{i18n.core.label.language}</FieldLabel>
            <Select items={languages} name="language" defaultValue={i18n.lang} required>
              <SelectTrigger id={languageId} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}

        <Field>
          <Button type="submit" disabled={pending} {...testId(testIds.invitations.submit)}>
            {pending ? i18n.invitations.state.creating : i18n.invitations.action.create}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
