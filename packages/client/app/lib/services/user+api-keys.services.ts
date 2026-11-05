import type { Cookie } from "~/lib/schemas/cookie";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiUserApiKeysSsr } from "~/lib/api/user+api-keys.ssr.api";
import { ApiUserApiKeys } from "~/lib/api/user+api-keys.api";
import { Service } from "./_services";

export class UserApiKeysService extends Service {
  private constructor() {
    super();
  }

  static create(): UserApiKeysService {
    return new this();
  }

  list = async ({
    cookie,
  }: {
    cookie: Cookie;
  }): Promise<Result<Api["UserApiKeys"]["Client"]["GetApiKeysResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiUserApiKeysSsr.create({ cookie }).list();
    });
  };

  submit = async ({
    apiKey,
  }: {
    apiKey: Api["UserApiKeys"]["Client"]["CreateApiKeyBody"];
  }): Promise<Result<Api["UserApiKeys"]["Client"]["CreateApiKeyResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiUserApiKeys.create().submit({ body: apiKey });
    });
  };

  delete = async ({
    apiKeyId,
  }: {
    apiKeyId: Api["UserApiKeys"]["Client"]["ApiKey"]["id"];
  }): Promise<Result<void>> => {
    return await tryCatch(async () => {
      await ApiUserApiKeys.create().delete({ apiKeyId });
    });
  };
}
