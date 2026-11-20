import type { Result } from "@usenullish/nullish-common";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { AdminServiceContext, type AdminServiceContextArgs } from "./_admin-service";
import { listPlansWithProduct } from "./_helpers/plans";

type Plan = Records["Subscription"]["Plans"]["Select"];

export class PlansService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): PlansService {
    return new this(args);
  }

  listPlans(): Promise<Result<Plan[]>> {
    return this._withDbContext(async (tx) => {
      return await listPlansWithProduct({ tx });
    });
  }
}
