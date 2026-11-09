import { startTransition, useActionState, useState, ViewTransition } from "react";
import { nonNullish, type Nullable } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseRunMigrationAction } from "~/context/form/run-migration.form";
import { Button } from "~/ui/components/button";
import { Field, FieldError } from "~/ui/components/field";
import { errorReason } from "~/kit/error-drawer/errors.utils";
import { useI18n } from "~/kit/i18n/i18n.context";
import { buildFormSubmit } from "~/kit/utils/form.utils";
import { testId } from "~/kit/tests/test.utils";
import { testIds } from "~/kit/tests/test-ids.constants";

type RunMigrationResponse = Api["MigrationsRun"]["Client"]["RunMigrationResponse"];

export const RunMigration = ({
  migrationId,
  label,
  disabled,
  onStarted,
}: {
  migrationId: Api["Migrations"]["Client"]["Migration"]["id"];
  label: string;
  disabled: boolean;
  onStarted: (args: Pick<RunMigrationResponse, "jobId">) => void;
}) => {
  const { i18n } = useI18n();

  const [error, setError] = useState<Nullable<string>>(null);

  const runMigrationAction = buildUseRunMigrationAction({ migrationId });

  const [, onAction, pending] = useActionState<FormState<RunMigrationResponse>, FormData>(
    async (prevState, formData) => {
      startTransition(() => setError(null));

      const next = await runMigrationAction(prevState, formData);

      if (next.name === "error") {
        startTransition(() => setError(errorReason(next.err) ?? i18n.migrations.text.run_error));
        return next;
      }

      if (next.name === "ready") {
        onStarted({ jobId: next.result.jobId });
      }

      return next;
    },
    INIT_FORM_STATE,
  );

  return (
    <form onSubmit={buildFormSubmit({ onAction })}>
      <Field>
        <Button type="submit" disabled={disabled || pending} {...testId(testIds.migration.run)}>
          {pending ? i18n.migrations.state.starting : label}
        </Button>

        {nonNullish(error) && (
          <ViewTransition>
            <FieldError>{error}</FieldError>
          </ViewTransition>
        )}
      </Field>
    </form>
  );
};
