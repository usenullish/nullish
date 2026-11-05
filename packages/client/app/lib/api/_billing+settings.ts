import type { Api } from "@usenullish/nullish-schema/server";

export interface ApiBillingSettingsWritableArgs {
  billingSettingId: Api["BillingSettings"]["Client"]["GetBillingSettingsResponse"]["settings"][number]["id"];
}
