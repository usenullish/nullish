import type { Result } from "@usenullish/nullish-common";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { AdminServiceContext, type AdminServiceContextArgs } from "./_admin-service";
import { listClaimsWithProduct } from "./_helpers/claims";

type Claim = Records["Subscription"]["Claims"]["Select"];

export class PlansService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): PlansService {
    return new this(args);
  }

  listClaims(): Promise<Result<Claim[]>> {
    return this._withDbContext(async (tx) => {
      return await listClaimsWithProduct({ tx });
    });
  }
}
