import { startTransition, useActionState, useId, useState, ViewTransition } from "react";
import { useNavigate } from "react-router";
import { nonNullish, type Nullable } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { MigrationProvider } from "@usenullish/nullish-schema/db";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseNewMigrationAction } from "~/context/form/new-migration.form";
import { OrganizationPath } from "~/navigation";
import { Button } from "~/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/ui/components/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/components/select";
import { errorReason } from "~/kit/error-drawer/errors.utils";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";

type CreateMigrationResponse = Api["Migrations"]["Client"]["CreateMigrationResponse"];

export const MigrationSource = ({
  organizationId,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}) => {
  const { i18n } = useI18n();
  const navigate = useNavigate();
  const providerId = useId();

  const [provider, setProvider] = useState(MigrationProvider.BEXIO);
  const [error, setError] = useState<Nullable<string>>(null);

  const providers = Object.values(MigrationProvider).map((value) => ({
    value,
    label: i18n.migrations.provider[value],
  }));

  const newMigrationAction = buildUseNewMigrationAction({ organizationId });

  const [, onAction, pending] = useActionState<FormState<CreateMigrationResponse>, FormData>(
    async (prevState, formData) => {
      startTransition(() => setError(null));

      const next = await newMigrationAction(prevState, formData);

      if (next.name === "error") {
        startTransition(() => setError(errorReason(next.err) ?? i18n.migrations.text.create_error));
        return next;
      }

      if (next.name === "ready") {
        await navigate(
          OrganizationPath.create({ organizationId }).to({
            path: `/migrations/${next.result.migration.id}/import`,
          }),
        );
      }

      return next;
    },
    INIT_FORM_STATE,
  );

  return (
    <form onSubmit={buildFormSubmit({ onAction })}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={providerId}>{i18n.migrations.label.source}</FieldLabel>
          <Select
            items={providers}
            name="provider"
            value={provider}
            onValueChange={(value: Nullable<MigrationProvider>) =>
              setProvider(value ?? MigrationProvider.BEXIO)
            }
            required
          >
            <SelectTrigger id={providerId} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {providers.map(({ value, label }) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        {nonNullish(error) && (
          <ViewTransition>
            <FieldError>{error}</FieldError>
          </ViewTransition>
        )}

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.migrations.state.creating : i18n.core.action.next}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
