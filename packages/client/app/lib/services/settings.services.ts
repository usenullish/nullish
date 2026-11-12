import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiSettingsSsr } from "~/lib/api/settings.ssr.api";
import { Service } from "./_services";

export class SettingsService extends Service {
  private constructor() {
    super();
  }

  static create(): SettingsService {
    return new this();
  }

  get = async (): Promise<Result<Api["Settings"]["Client"]["GetSettingsResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiSettingsSsr.create().get();
    });
  };
}
