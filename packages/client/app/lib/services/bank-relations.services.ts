import type { Cookie } from "~/lib/schemas/cookie";
import type { ApiListArgs } from "~/lib/api/_api";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { ApiBankRelationsSsr } from "~/lib/api/bank-relations.ssr.api";
import type { Api } from "@usenullish/nullish-schema/server";
import { ApiBankRelations } from "~/lib/api/bank-relations.api";
import type { ApiOrganizationsGetByIdArgs } from "~/lib/api/_organizations";
import type {
  ApiBankRelationsGetByIdArgs,
  ApiBankRelationsWritableArgs,
} from "~/lib/api/_bank-relations";
import { Service } from "./_services";

export class BankRelationsService extends Service {
  private constructor() {
    super();
  }

  static create(): BankRelationsService {
    return new this();
  }

  getById = async ({
    cookie,
    id,
  }: {
    cookie: Cookie;
  } & ApiBankRelationsGetByIdArgs): Promise<
    Result<Api["BankRelations"]["Client"]["GetBankRelationResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiBankRelationsSsr.create({ cookie }).getById({ id });
    });
  };

  list = async ({
    cookie,
    ...rest
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs &
    ApiListArgs): Promise<Result<Api["BankRelations"]["Client"]["GetBankRelationsResponse"]>> => {
    return await tryCatch(async () => {
      return await ApiBankRelationsSsr.create({ cookie }).list(rest);
    });
  };

  listAll = async ({
    cookie,
    orgId,
  }: {
    cookie: Cookie;
  } & ApiOrganizationsGetByIdArgs): Promise<
    Result<Api["BankRelations"]["Client"]["GetBankRelationsResponse"]>
  > => {
    return await tryCatch(async () => {
      const api = ApiBankRelationsSsr.create({ cookie });

      const bankRelations = await this._listAll({
        listFn: async (query) => {
          const { bankRelations } = await api.list({ orgId, query });
          return bankRelations;
        },
      });

      return { bankRelations };
    });
  };

  submit = async ({
    bankRelation,
    organizationId,
  }: {
    bankRelation: Api["BankRelations"]["Client"]["CreateBankRelationBody"];
    organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  }): Promise<Result<Api["BankRelations"]["Client"]["CreateBankRelationResponse"]>> => {
    try {
      const result = await ApiBankRelations.create().submit({
        body: bankRelation,
        orgId: organizationId,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  update = async ({
    values: body,
    ...rest
  }: {
    bankRelationId: Api["BankRelations"]["Client"]["BankRelation"]["id"];
    values: Api["BankRelations"]["Client"]["UpdateBankRelationBody"];
  }): Promise<Result<Api["BankRelations"]["Client"]["UpdateBankRelationResponse"]>> => {
    try {
      const result = await ApiBankRelations.create().update({
        ...rest,
        body,
      });

      return { status: "success", result };
    } catch (err: unknown) {
      return { status: "error", err };
    }
  };

  importStatements = async ({
    bankRelationId,
    file,
  }: {
    file: Api["BankRelations"]["Client"]["ImportStatementsBody"]["file"];
  } & ApiBankRelationsWritableArgs): Promise<
    Result<Api["BankRelations"]["Client"]["ImportStatementsResponse"]>
  > => {
    return await tryCatch(async () => {
      return await ApiBankRelations.create().importStatements({ bankRelationId, body: { file } });
    });
  };

  delete = async ({ bankRelationId }: ApiBankRelationsWritableArgs): Promise<Result<void>> => {
    return await tryCatch(async () => {
      await ApiBankRelations.create().delete({ bankRelationId });
    });
  };
}
