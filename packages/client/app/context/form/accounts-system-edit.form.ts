import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { type Result } from "@usenullish/nullish-common";
import { SystemAccountsService } from "~/lib/services/accounts-system.services";
import * as z from "zod";

interface SubmitSystemAccountEditArgs {
  formData: FormData;
  systemAccountId: Api["SystemAccounts"]["Client"]["SystemAccount"]["id"];
}

export const buildUseSystemAccountEditAction = ({
  systemAccountId,
}: Pick<SubmitSystemAccountEditArgs, "systemAccountId">): UseActionStateFn => {
  const useSystemAccountEditAction: UseActionStateFn = async (_prevState, formData) => {
    const result = await submitSystemAccountEdit({
      formData,
      systemAccountId,
    });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useSystemAccountEditAction;
};

const FormSystemAccountEditSchema =
  ApiSchema.SystemAccounts.UpdateSystemAccountRequestSchema.extend({
    version: z.coerce.number(),
  });

const submitSystemAccountEdit = async ({
  formData,
  systemAccountId,
}: SubmitSystemAccountEditArgs): Promise<
  Result<Api["SystemAccounts"]["Client"]["UpdateSystemAccountResponse"]>
> => {
  const values = FormSystemAccountEditSchema.parse({
    accountId: formData.get(`accountId`),
    purpose: formData.get(`purpose`),
    version: formData.get(`version`),
  });

  return await SystemAccountsService.create().update({ systemAccountId, values });
};
