import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiBankMovementsSsr } from "~/lib/api/bank-movements.ssr.api";
import { ApiBankMovements } from "~/lib/api/bank-movements.api";
import type { ApiBankRelationsGetByIdArgs } from "~/lib/api/_bank-relations";
import type { ApiBankMovementsGetByIdArgs } from "~/lib/api/_bank-movements";
import { Service } from "./_services";

export class BankMovementsService extends Service {
  private constructor() {
    super();
  }

  static create(): BankMovementsService {
    return new this();
  }

  getById = async ({
    cookie,
    id,
  }: {
    cookie: Cookie;
  } & ApiBankMovementsGetByIdArgs): Promise<
    Result<Api["BankMovements"]["Client"]["GetBankMovementResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiBankMovementsSsr.create({ cookie }).getById({ id });
    });
  };

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiBankRelationsGetByIdArgs &
    ApiListArgs<Api["BankMovements"]["Client"]["GetBankMovementsFilters"]>): Promise<
    Result<Api["BankMovements"]["Client"]["GetBankMovementsResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiBankMovementsSsr.create({ cookie }).list(rest);
    });
  };

  reconcile = async ({
    bankMovementId,
    reconciliation: body,
  }: {
    bankMovementId: Api["BankMovements"]["Client"]["BankMovement"]["id"];
    reconciliation: Api["BankMovements"]["Client"]["ReconcileBankMovementBody"];
  }): Promise<Result<Api["BankMovements"]["Client"]["ReconcileBankMovementResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiBankMovements.create().reconcile({ bankMovementId, body });
    });
  };

  ignore = async ({
    bankMovementId,
  }: {
    bankMovementId: Api["BankMovements"]["Client"]["BankMovement"]["id"];
  }): Promise<Result<Api["BankMovements"]["Client"]["IgnoreBankMovementResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiBankMovements.create().ignore({ bankMovementId });
    });
  };
}
