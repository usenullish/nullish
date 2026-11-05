import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Result } from "@usenullish/nullish-common";
import { BankRelationsService } from "~/lib/services/bank-relations.services";
import { readBankRelationFormFields } from "~/context/form/_bank-relation.form";
import * as z from "zod";

interface SubmitBankRelationEditArgs {
  formData: FormData;
  bankRelationId: Api["BankRelations"]["Client"]["BankRelation"]["id"];
}

export const buildUseBankRelationEditAction = ({
  bankRelationId,
}: Pick<SubmitBankRelationEditArgs, "bankRelationId">): UseActionStateFn => {
  const useBankRelationEditAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitBankRelationEdit({
      formData,
      bankRelationId,
    });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useBankRelationEditAction;
};

const FormBankRelationEditSchema = ApiSchema.BankRelations.UpdateBankRelationRequestSchema.extend({
  version: z.coerce.number(),
});

const submitBankRelationEdit = async ({
  formData,
  bankRelationId,
}: SubmitBankRelationEditArgs): Promise<
  Result<Api["BankRelations"]["Client"]["UpdateBankRelationResponse"]>
> => {
  const values = FormBankRelationEditSchema.parse({
    ...readBankRelationFormFields({ formData }),
    version: formData.get("version"),
  });

  return await BankRelationsService.create().update({ bankRelationId, values });
};
