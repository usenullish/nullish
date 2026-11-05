import type { Api } from "@usenullish/nullish-schema/server";

export interface ApiVatMethodsGetByIdArgs {
  id: NonNullable<Api["VatMethods"]["Client"]["GetVatMethodResponse"]["method"]>["id"];
}

export interface ApiVatMethodsWritableArgs {
  vatMethodId: Api["VatMethods"]["Client"]["VatMethod"]["id"];
}
