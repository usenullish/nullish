import { startTransition, useActionState, useId, useState, ViewTransition } from "react";
import { useRevalidator } from "react-router";
import { isNullish, nonNullish, type Nullable } from "@usenullish/nullish-common";
import { type Api, MIGRATION_DATASET_FILE_MAX_SIZE } from "@usenullish/nullish-schema/server";
import { MigrationDatasetType } from "@usenullish/nullish-schema/db";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUseUploadDatasetAction } from "~/context/form/upload-dataset.form";
import { Button } from "~/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/ui/components/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/ui/components/select";
import { FileInput } from "~/components/core/file-input";
import { errorReason } from "~/kit/error-drawer/errors.utils";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";
import { buildFormSubmit } from "~/kit/utils/form.utils";
import { testId } from "~/kit/tests/test.utils";
import { testIds } from "~/kit/tests/test-ids.constants";

type Migration = Api["Migrations"]["Client"]["Migration"];
type Dataset = Api["MigrationsDatasets"]["Client"]["Dataset"];
type UploadDatasetResponse = Api["MigrationsDatasets"]["Client"]["UploadDatasetResponse"];

const MAX_SIZE_IN_KB = MIGRATION_DATASET_FILE_MAX_SIZE / 1024;

export const UploadDataset = ({
  migration,
  dataset,
  open,
  onOpenChange,
}: {
  migration: Migration;
  dataset?: Dataset;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { i18n } = useI18n();
  const { revalidate } = useRevalidator();

  const typeId = useId();
  const validOnId = useId();
  const fileId = useId();

  const [type, setType] = useState(dataset?.type ?? MigrationDatasetType.ACCOUNTS);
  const [error, setError] = useState<Nullable<string>>(null);

  const types = Object.values(MigrationDatasetType).map((value) => ({
    value,
    label: i18n.migrations.type[value],
  }));

  const provider = i18n.migrations.provider[migration.provider];

  const uploadDatasetAction = buildUseUploadDatasetAction({
    migrationId: migration.id,
    datasetId: dataset?.id,
  });

  const [, onAction, pending] = useActionState<FormState<UploadDatasetResponse>, FormData>(
    async (prevState, formData) => {
      startTransition(() => setError(null));

      const state = await uploadDatasetAction(prevState, formData);

      if (state.name === "error") {
        startTransition(() =>
          setError(errorReason(state.err) ?? i18n.migrations.text.upload_error),
        );
        return state;
      }

      if (state.name === "ready") {
        await revalidate();
        onOpenChange(false);
      }

      return state;
    },
    INIT_FORM_STATE,
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={buildFormSubmit({ onAction })}
          onChange={() => startTransition(() => setError(null))}
        >
          <FieldGroup>
            <DialogHeader>
              <DialogTitle>
                {isNullish(dataset)
                  ? i18n.migrations.text.upload_title
                  : replacePlaceholders(i18n.migrations.text.replace_title, {
                      "{name}": dataset.name,
                    })}
              </DialogTitle>
              <DialogDescription>
                {replacePlaceholders(i18n.migrations.text.upload_description, {
                  "{provider}": provider,
                  "{size}": `${MAX_SIZE_IN_KB}`,
                })}
              </DialogDescription>
            </DialogHeader>

            {isNullish(dataset) ? (
              <Field>
                <FieldLabel htmlFor={typeId}>{i18n.core.label.type}</FieldLabel>
                <Select
                  items={types}
                  name="type"
                  value={type}
                  onValueChange={(value: Nullable<MigrationDatasetType>) =>
                    startTransition(() => {
                      setError(null);
                      setType(value ?? MigrationDatasetType.ACCOUNTS);
                    })
                  }
                  required
                >
                  <SelectTrigger id={typeId} className="w-full" {...testId(testIds.migration.type)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map(({ value, label }) => (
                      <SelectItem
                        key={value}
                        value={value}
                        {...testId(`${testIds.migration.type}-${value}`)}
                      >
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            ) : (
              <input type="hidden" name="type" value={dataset.type} />
            )}

            {type === MigrationDatasetType.BALANCES && (
              <Field>
                <FieldLabel htmlFor={validOnId}>{i18n.migrations.label.valid_on}</FieldLabel>
                <Input
                  id={validOnId}
                  name="validOn"
                  type="date"
                  required
                  {...testId(testIds.migration.validOn)}
                />
              </Field>
            )}

            <Field {...testId(testIds.migration.file)}>
              <FieldLabel htmlFor={fileId}>{i18n.migrations.label.file}</FieldLabel>
              <FileInput id={fileId} name="file" accept=".xlsx,.csv" required />
            </Field>

            {nonNullish(error) && (
              <ViewTransition>
                <FieldError>{error}</FieldError>
              </ViewTransition>
            )}

            <DialogFooter>
              <Button type="submit" disabled={pending} {...testId(testIds.migration.upload)}>
                {pending
                  ? i18n.migrations.state.uploading
                  : isNullish(dataset)
                    ? i18n.migrations.action.add_file
                    : i18n.migrations.action.replace_file}
              </Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
};
