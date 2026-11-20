import { type Result, tryCatch } from "@usenullish/nullish-common";
import { DbUserContext, type DbUserContextArgs } from "@usenullish/nullish-db";
import type { Composites } from "@usenullish/nullish-schema/composites";
import { listCustomPlans } from "../_helpers/custom-plans";

type CustomPlan = Composites["CustomPlans"]["Select"];

export class DbCustomPlans extends DbUserContext {
  private constructor(args: DbUserContextArgs) {
    super(args);
  }

  static create(args: DbUserContextArgs): DbCustomPlans {
    return new this(args);
  }

  list(): Promise<Result<CustomPlan[]>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => await listCustomPlans({ tx }));
    });
  }
}
