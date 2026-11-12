import type { Api } from "@usenullish/nullish-schema/server";

export const DEFAULT_SETTINGS: Api["Settings"]["Client"]["GetSettingsResponse"] = {
  settings: { mail: { enabled: false } },
};
