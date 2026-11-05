import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { BankRelationsService } from "~/lib/services/bank-relations.services";
import type { ApiBankRelationsWritableArgs } from "~/lib/api/_bank-relations";

type ImportStatementsResponse = Api["BankRelations"]["Client"]["ImportStatementsResponse"];

export const buildUseImportStatementsAction = ({
  bankRelationId,
}: ApiBankRelationsWritableArgs): UseActionStateFn<ImportStatementsResponse> => {
  const useImportStatementsAction: UseActionStateFn<ImportStatementsResponse> = async (
    _prevState,
    formData,
  ) => {
    const { file } = ApiSchema.BankRelationsStatementsImport.ImportStatementsRequestSchema.parse({
      file: formData.get("file"),
    });

    const result = await BankRelationsService.create().importStatements({ bankRelationId, file });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: result.result };
  };

  return useImportStatementsAction;
};
