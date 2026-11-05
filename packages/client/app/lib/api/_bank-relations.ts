import type { Api } from "@usenullish/nullish-schema/server";

export interface ApiBankRelationsGetByIdArgs {
  id: NonNullable<Api["BankRelations"]["Client"]["GetBankRelationResponse"]["bankRelation"]>["id"];
}

export interface ApiBankRelationsWritableArgs {
  bankRelationId: Api["BankRelations"]["Client"]["BankRelation"]["id"];
}
