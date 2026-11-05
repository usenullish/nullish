import type { Api } from "@usenullish/nullish-schema/server";

export interface ApiBankMovementsGetByIdArgs {
  id: NonNullable<Api["BankMovements"]["Client"]["GetBankMovementResponse"]["bankMovement"]>["id"];
}
