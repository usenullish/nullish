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
import { buildFormSubmit } from "~/kit/utils/form.utils";

const ROLES = ApiSchema.InvitationsCreate.CreateInvitationRequestSchema.shape.role.options;

export const NewInvitationForm = ({
  onAction,
  pending,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
}) => {
  const { i18n } = useI18n();

  const emailId = useId();
  const roleId = useId();

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

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.invitations.state.creating : i18n.invitations.action.create}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
