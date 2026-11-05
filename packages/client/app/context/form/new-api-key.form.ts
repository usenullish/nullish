import type { UseActionStateFn } from "~/context/form/form";
import { type Api, ApiSchema } from "@usenullish/nullish-schema/server";
import { ApiKeyAction, ApiKeyResource } from "@usenullish/nullish-schema/auth";
import { type Result } from "@usenullish/nullish-common";
import * as z from "zod";
import { UserApiKeysService } from "~/lib/services/user+api-keys.services";

type CreatedApiKey = Api["UserApiKeys"]["Client"]["CreateApiKeyResponse"];

export const buildUseNewApiKeyAction = (): UseActionStateFn<CreatedApiKey> => {
  const useNewApiKeyAction: UseActionStateFn<CreatedApiKey> = async (_prevState, formData) => {
    const result = await submitApiKey({ formData });

    if (result.status === "error") {
      return { name: "error" as const, err: result.err };
    }

    return { name: "ready" as const, result: result.result };
  };

  return useNewApiKeyAction;
};

const FormCreateApiKeySchema = ApiSchema.UserApiKeys.CreateApiKeyRequestSchema.omit({
  permissions: true,
}).extend({
  expiresInDays: z.coerce
    .number()
    .pipe(ApiSchema.UserApiKeys.CreateApiKeyRequestSchema.shape.expiresInDays),
  resource: z.enum(ApiKeyResource),
  access: z.enum(ApiKeyAction),
});

const submitApiKey = async ({
  formData,
}: {
  formData: FormData;
}): Promise<Result<CreatedApiKey>> => {
  const { resource, access, ...values } = FormCreateApiKeySchema.parse({
    name: formData.get("name"),
    expiresInDays: formData.get("expiresInDays"),
    resource: formData.get("resource"),
    access: formData.get("access"),
  });

  const permissions: Api["UserApiKeys"]["Client"]["CreateApiKeyBody"]["permissions"] = {
    [resource]:
      access === ApiKeyAction.WRITE ? [ApiKeyAction.READ, ApiKeyAction.WRITE] : [ApiKeyAction.READ],
  };

  return await UserApiKeysService.create().submit({ apiKey: { ...values, permissions } });
};
