import type { Result } from "@usenullish/nullish-common";
import type { PostgresDbInstance } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { AdminServiceContext, type AdminServiceContextArgs } from "../../_service";
import { insertUsage } from "../_helpers/usages";

type SelectLlmUsages = Records["Metering"]["LlmUsages"]["Select"];
type InsertLlmUsages = Records["Metering"]["LlmUsages"]["Insert"];

export class LlmUsagesService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): LlmUsagesService {
    return new this(args);
  }

  record({ usage }: { usage: InsertLlmUsages }): Promise<Result<SelectLlmUsages>> {
    return this._withDbContext(async (tx) => await insertUsage({ tx, usage }));
  }
}
