import type { Api } from "@usenullish/nullish-schema/server";
import { PublicServerLoader } from "~/context/server/_server";
import { SettingsService } from "~/lib/services/settings.services";

export class SettingsServer extends PublicServerLoader {
  #service = SettingsService.create();

  private constructor(init: { context: string }) {
    super(init);
  }

  static create(): SettingsServer {
    return new SettingsServer({ context: "settings" });
  }

  async get(): Promise<Api["Settings"]["Client"]["GetSettingsResponse"]> {
    return await this._load({
      errorFallbackMsg: "Unexpected error while loading the settings",
      loaderFn: this.#service.get,
    });
  }
}
