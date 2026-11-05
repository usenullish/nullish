import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { type Result } from "@usenullish/nullish-common";
import { AccountsService } from "~/lib/services/accounts.services";
import { readAccountFormFields } from "~/context/form/_account.form";
import * as z from "zod";

interface SubmitAccountEditArgs {
  formData: FormData;
  accountId: Api["Accounts"]["Client"]["Account"]["id"];
}

export const buildUseAccountEditAction = ({
  accountId,
}: Pick<SubmitAccountEditArgs, "accountId">): UseActionStateFn => {
  const useAccountEditAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitAccountEdit({ formData, accountId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useAccountEditAction;
};

const FormAccountEditSchema = ApiSchema.Accounts.UpdateAccountRequestSchema.extend({
  version: z.coerce.number(),
});

const submitAccountEdit = async ({
  formData,
  accountId,
}: SubmitAccountEditArgs): Promise<Result<Api["Accounts"]["Client"]["UpdateAccountResponse"]>> => {
  const values = FormAccountEditSchema.parse({
    ...readAccountFormFields({ formData }),
    version: formData.get("version"),
  });

  return await AccountsService.create().update({ accountId, values });
};
