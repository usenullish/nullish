import { useId } from "react";
import {
  API_KEY_DEFAULT_EXPIRATION_DAYS,
  API_KEY_MAX_EXPIRATION_DAYS,
  ApiKeyAction,
  ApiKeyResource,
} from "@usenullish/nullish-schema/auth";
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
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { buildFormSubmit } from "~/kit/utils/form.utils";

const EXPIRATION_DAYS = [
  API_KEY_DEFAULT_EXPIRATION_DAYS,
  30,
  90,
  API_KEY_MAX_EXPIRATION_DAYS,
] as const;

export const NewApiKeyForm = ({
  onAction,
  pending,
}: {
  onAction: (payload: FormData) => void;
  pending: boolean;
}) => {
  const { i18n } = useI18n();

  const nameId = useId();
  const expirationId = useId();
  const resourceId = useId();
  const accessId = useId();

  const expirations = EXPIRATION_DAYS.map((days) => ({
    value: `${days}`,
    label: replacePlaceholders(i18n.api_keys.label.days, { "{days}": `${days}` }),
  }));

  const resources = [
    { value: ApiKeyResource.MCP, label: i18n.api_keys.resource[ApiKeyResource.MCP] },
    { value: ApiKeyResource.API, label: i18n.api_keys.resource[ApiKeyResource.API] },
  ];

  const accesses = [
    { value: ApiKeyAction.READ, label: i18n.api_keys.label.read },
    { value: ApiKeyAction.WRITE, label: i18n.api_keys.label.read_write },
  ];

  return (
    <form onSubmit={buildFormSubmit({ onAction })}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={nameId}>{i18n.core.label.name}</FieldLabel>
          <Input id={nameId} name="name" maxLength={32} required />
        </Field>

        <Field>
          <FieldLabel htmlFor={expirationId}>{i18n.api_keys.label.expiration}</FieldLabel>
          <Select
            items={expirations}
            name="expiresInDays"
            defaultValue={`${API_KEY_DEFAULT_EXPIRATION_DAYS}`}
            required
          >
            <SelectTrigger id={expirationId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {expirations.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor={resourceId}>{i18n.api_keys.label.resource}</FieldLabel>
          <Select items={resources} name="resource" defaultValue={ApiKeyResource.MCP} required>
            <SelectTrigger id={resourceId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {resources.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor={accessId}>{i18n.api_keys.label.access}</FieldLabel>
          <Select items={accesses} name="access" defaultValue={ApiKeyAction.READ} required>
            <SelectTrigger id={accessId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accesses.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.api_keys.state.creating : i18n.api_keys.action.create}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
