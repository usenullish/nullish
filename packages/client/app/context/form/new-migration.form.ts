import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { tryCatch } from "@usenullish/nullish-common";
import { MigrationsService } from "~/lib/services/migrations.services";

type CreateMigrationResponse = Api["Migrations"]["Client"]["CreateMigrationResponse"];

export const buildUseNewMigrationAction = ({
  organizationId,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}): UseActionStateFn<CreateMigrationResponse> => {
  const useNewMigrationAction: UseActionStateFn<CreateMigrationResponse> = async (
    _prevState,
    formData,
  ) => {
    const parsed = await tryCatch(async () =>
      ApiSchema.Migrations.CreateMigrationRequestSchema.parse({
        provider: formData.get("provider"),
      }),
    );

    if (parsed.status === "error") {
      return { name: "error" as const, err: parsed.err };
    }

    const result = await MigrationsService.create().submit({
      migration: parsed.result,
      organizationId,
    });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: result.result };
  };

  return useNewMigrationAction;
};
