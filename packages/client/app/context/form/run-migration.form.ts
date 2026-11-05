import type { UseActionStateFn } from "~/context/form/form";
import type { Api } from "@usenullish/nullish-schema/server";
import { MigrationsService } from "~/lib/services/migrations.services";
import type { ApiMigrationsWritableArgs } from "~/lib/api/_migrations";

type RunMigrationResponse = Api["MigrationsRun"]["Client"]["RunMigrationResponse"];

export const buildUseRunMigrationAction = ({
  migrationId,
}: ApiMigrationsWritableArgs): UseActionStateFn<RunMigrationResponse> => {
  const useRunMigrationAction: UseActionStateFn<RunMigrationResponse> = async () => {
    const result = await MigrationsService.create().run({ migrationId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: result.result };
  };

  return useRunMigrationAction;
};
