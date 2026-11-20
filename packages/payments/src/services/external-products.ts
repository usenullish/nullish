import type { Result } from "@usenullish/nullish-common";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { AdminServiceContext, type AdminServiceContextArgs } from "./_admin-service";
import { listExternalProducts } from "./_helpers/external-products";

type ExternalProduct = Records["Subscription"]["ExternalProducts"]["Select"];

export class ExternalProductsService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): ExternalProductsService {
    return new this(args);
  }

  list(): Promise<Result<ExternalProduct[]>> {
    return this._withDbContext(async (tx) => {
      return await listExternalProducts({ tx });
    });
  }
}
