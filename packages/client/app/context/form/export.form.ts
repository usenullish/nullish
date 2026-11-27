import { ExportsService } from "~/lib/services/exports.services";
import type { UseActionStateFn } from "~/context/form/form";
import type { Api } from "@usenullish/nullish-schema/server";

export const buildUseExportAction = ({
  organizationId,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}): UseActionStateFn<Api["Exports"]["Client"]["GenerateExportResponse"]> => {
  const useAction: UseActionStateFn<Api["Exports"]["Client"]["GenerateExportResponse"]> = async (
    _prevState,
    _formData,
  ) => {
    const result = await ExportsService.create().generate({ orgId: organizationId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: result.result };
  };

  return useAction;
};
