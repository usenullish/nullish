import { isNullish, type Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { SettingsServer } from "~/context/server/settings.server";

type GetSettingsResponse = Api["Settings"]["Client"]["GetSettingsResponse"];

export class SettingsCache {
  static #instance: Option<SettingsCache>;

  #settings: Option<GetSettingsResponse>;

  private constructor() {}

  static getInstance(): SettingsCache {
    if (isNullish(SettingsCache.#instance)) {
      SettingsCache.#instance = new SettingsCache();
    }

    return SettingsCache.#instance;
  }

  async get(): Promise<GetSettingsResponse> {
    if (isNullish(this.#settings)) {
      this.#settings = await SettingsServer.create().get();
    }

    return this.#settings;
  }
}
