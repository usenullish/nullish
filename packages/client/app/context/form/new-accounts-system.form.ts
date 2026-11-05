import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { type Result } from "@usenullish/nullish-common";
import { SystemAccountsService } from "~/lib/services/accounts-system.services";

interface SubmitAccountsSystemArgs {
  formData: FormData;
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
}

export const buildUseNewAccountsSystemAction = ({
  organizationId,
}: Pick<SubmitAccountsSystemArgs, "organizationId">): UseActionStateFn => {
  const useNewAccountsSystemAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitAccountsSystem({ formData, organizationId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useNewAccountsSystemAction;
};

const FormCreateAccountsSystemSchema = ApiSchema.SystemAccounts.CreateSystemAccountRequestSchema;

const submitAccountsSystem = async ({
  formData,
  organizationId,
}: SubmitAccountsSystemArgs): Promise<
  Result<Api["SystemAccounts"]["Client"]["CreateSystemAccountResponse"]>
> => {
  const systemAccount = FormCreateAccountsSystemSchema.parse({
    accountId: formData.get(`accountId`),
    purpose: formData.get(`purpose`),
  });

  return await SystemAccountsService.create().submit({ systemAccount, organizationId });
};
