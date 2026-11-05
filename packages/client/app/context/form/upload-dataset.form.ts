import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { MigrationDatasetType } from "@usenullish/nullish-schema/db";
import { isNullish, tryCatch } from "@usenullish/nullish-common";
import { MigrationsService } from "~/lib/services/migrations.services";
import type {
  ApiMigrationDatasetsWritableArgs,
  ApiMigrationsWritableArgs,
} from "~/lib/api/_migrations";

type UploadDatasetResponse = Api["MigrationsDatasets"]["Client"]["UploadDatasetResponse"];

export const buildUseUploadDatasetAction = ({
  migrationId,
  datasetId,
}: ApiMigrationsWritableArgs &
  Partial<ApiMigrationDatasetsWritableArgs>): UseActionStateFn<UploadDatasetResponse> => {
  const useUploadDatasetAction: UseActionStateFn<UploadDatasetResponse> = async (
    _prevState,
    formData,
  ) => {
    const parsed = await tryCatch(async () => parseDataset({ formData }));

    if (parsed.status === "error") {
      return { name: "error" as const, err: parsed.err };
    }

    const { result: dataset } = parsed;

    const result = isNullish(datasetId)
      ? await MigrationsService.create().uploadDataset({ migrationId, dataset })
      : await MigrationsService.create().replaceDataset({ migrationId, datasetId, dataset });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: result.result };
  };

  return useUploadDatasetAction;
};

const parseDataset = ({
  formData,
}: {
  formData: FormData;
}): Api["MigrationsDatasets"]["Client"]["UploadDatasetBody"] => {
  const type = formData.get("type");
  const file = formData.get("file");

  return ApiSchema.MigrationsDatasets.UploadDatasetRequestSchema.parse(
    type === MigrationDatasetType.BALANCES
      ? { type, file, validOn: formData.get("validOn") }
      : { type, file },
  );
};
