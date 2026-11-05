import type { Api } from "@usenullish/nullish-schema/server";

export interface ApiVatSettingsGetByIdArgs {
  id: NonNullable<Api["VatSettings"]["Client"]["GetVatSettingResponse"]["setting"]>["id"];
}

export interface ApiVatSettingsWritableArgs {
  vatSettingId: Api["VatSettings"]["Client"]["VatSetting"]["id"];
}
