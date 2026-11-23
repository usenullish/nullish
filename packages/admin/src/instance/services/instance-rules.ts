import type { Option, Result } from "@usenullish/nullish-common";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { AdminServiceContext, type AdminServiceContextArgs } from "../../_service";
import { getInstanceRules, upsertInstanceRules } from "../_helpers/instance-rules";

type InstanceRules = Records["Instance"]["InstanceRules"]["Select"];

export class InstanceRulesService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): InstanceRulesService {
    return new this(args);
  }

  get(): Promise<Result<Option<InstanceRules>>> {
    return this._withDbContext(async (tx) => await getInstanceRules({ tx }));
  }

  upsert({
    rules,
  }: {
    rules: Records["Instance"]["InstanceRules"]["Insert"];
  }): Promise<Result<InstanceRules>> {
    return this._withDbContext(async (tx) => {
      const values =
        RecordsSchema.Instance.InstanceRulesSchema.InsertInstanceRulesSchema.parse(rules);

      return await upsertInstanceRules({ tx, rules: values });
    });
  }
}
