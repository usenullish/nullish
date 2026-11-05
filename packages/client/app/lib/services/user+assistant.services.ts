import type { Cookie } from "~/lib/schemas/cookie";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiUserAssistantSsr } from "~/lib/api/user+assistant.ssr.api";
import { Service } from "./_services";

export class UserAssistantService extends Service {
  private constructor() {
    super();
  }

  static create(): UserAssistantService {
    return new this();
  }

  get = async ({
    cookie,
  }: {
    cookie: Cookie;
  }): Promise<Result<Api["Assistant"]["Client"]["GetAssistantResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiUserAssistantSsr.create({ cookie }).get();
    });
  };
}
