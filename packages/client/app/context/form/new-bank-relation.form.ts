import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import type { Result } from "@usenullish/nullish-common";
import { BankRelationsService } from "~/lib/services/bank-relations.services";
import { readBankRelationFormFields } from "~/context/form/_bank-relation.form";

interface SubmitBankRelationArgs {
  formData: FormData;
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}

type CreatedBankRelation = Api["BankRelations"]["Client"]["CreateBankRelationResponse"];

export const buildUseNewBankRelationAction = ({
  organizationId,
}: Pick<SubmitBankRelationArgs, "organizationId">): UseActionStateFn<CreatedBankRelation> => {
  const useNewBankRelationAction: UseActionStateFn<CreatedBankRelation> = async (
    _prevState,
    formData,
  ) => {
    const result = await submitBankRelation({ formData, organizationId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: result.result };
  };

  return useNewBankRelationAction;
};

const FormCreateBankRelationSchema = ApiSchema.BankRelations.CreateBankRelationRequestSchema;

const submitBankRelation = async ({
  formData,
  organizationId,
}: SubmitBankRelationArgs): Promise<
  Result<Api["BankRelations"]["Client"]["CreateBankRelationResponse"]>
> => {
  const bankRelation = FormCreateBankRelationSchema.parse(readBankRelationFormFields({ formData }));

  return await BankRelationsService.create().submit({ organizationId, bankRelation });
};
