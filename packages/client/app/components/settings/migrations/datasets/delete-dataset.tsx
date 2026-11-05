import type { Api } from "@usenullish/nullish-schema/server";
import { DeleteRecord } from "~/components/core/delete-record";
import { MigrationsService } from "~/lib/services/migrations.services";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const DeleteDataset = ({
  dataset,
  open,
  onOpenChange,
}: {
  dataset: Api["MigrationsDatasets"]["Client"]["Dataset"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { i18n } = useI18n();

  return (
    <DeleteRecord
      delete={() => MigrationsService.create().deleteDataset({ datasetId: dataset.id })}
      texts={{
        title: replacePlaceholders(i18n.migrations.text.delete_file_title, {
          "{name}": dataset.name,
        }),
        description: i18n.migrations.text.delete_file_description,
        success: i18n.migrations.toast.delete_file_success,
        error: i18n.migrations.toast.delete_file_error,
      }}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
};
