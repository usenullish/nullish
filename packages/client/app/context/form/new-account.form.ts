import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { type Result } from "@usenullish/nullish-common";
import { AccountsService } from "~/lib/services/accounts.services";
import { readAccountFormFields } from "~/context/form/_account.form";

interface SubmitAccountArgs {
  formData: FormData;
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}

export const buildUseNewAccountAction = ({
  organizationId,
}: Pick<SubmitAccountArgs, "organizationId">): UseActionStateFn => {
  const useNewAccountAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitAccount({ formData, organizationId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useNewAccountAction;
};

const FormCreateAccountSchema = ApiSchema.Accounts.CreateAccountRequestSchema;

const submitAccount = async ({
  formData,
  organizationId,
}: SubmitAccountArgs): Promise<Result<Api["Accounts"]["Client"]["CreateAccountResponse"]>> => {
  const account = FormCreateAccountSchema.parse(readAccountFormFields({ formData }));

  return await AccountsService.create().submit({ account, organizationId });
};
