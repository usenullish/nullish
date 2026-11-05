import type { UseActionStateFn } from "~/context/form/form";
import type { Api } from "@usenullish/nullish-schema/server";
import { UserApiKeysService } from "~/lib/services/user+api-keys.services";

export const buildUseDeleteApiKeyAction = ({
  apiKeyId,
}: {
  apiKeyId: Api["UserApiKeys"]["Client"]["ApiKey"]["id"];
}): UseActionStateFn => {
  const useDeleteApiKeyAction: UseActionStateFn = async () => {
    const result = await UserApiKeysService.create().delete({ apiKeyId });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: undefined };
  };

  return useDeleteApiKeyAction;
};
