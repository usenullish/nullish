import { useState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { MigrationStatus } from "@usenullish/nullish-schema/db";
import { DropdownMenuItem } from "~/ui/components/dropdown-menu";
import { RecordActions } from "~/components/core/record-actions";
import { UploadDataset } from "~/components/settings/migrations/datasets/upload-dataset";
import { DeleteDataset } from "~/components/settings/migrations/datasets/delete-dataset";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const DatasetActions = ({
  migration,
  dataset,
}: {
  migration: Api["Migrations"]["Client"]["Migration"];
  dataset: Api["MigrationsDatasets"]["Client"]["Dataset"];
}) => {
  const { i18n } = useI18n();
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const editable = migration.status === MigrationStatus.DRAFT;

  return (
    <RecordActions
      record={dataset}
      items={
        editable && (
          <WriteGuard>
            <DropdownMenuItem onClick={() => setReplaceOpen(true)}>
              {i18n.migrations.action.replace_file}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
              {i18n.core.action.delete}
            </DropdownMenuItem>
          </WriteGuard>
        )
      }
    >
      {editable && (
        <>
          <UploadDataset
            migration={migration}
            dataset={dataset}
            open={replaceOpen}
            onOpenChange={setReplaceOpen}
          />
          <DeleteDataset dataset={dataset} open={deleteOpen} onOpenChange={setDeleteOpen} />
        </>
      )}
    </RecordActions>
  );
};
