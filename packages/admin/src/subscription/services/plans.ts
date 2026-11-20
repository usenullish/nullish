import { asc, eq } from "drizzle-orm";
import {
  assertArrayAtMostOne,
  assertNonNullish,
  type Option,
  type Result,
} from "@usenullish/nullish-common";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { insertMany, selectMany, updateMany } from "@usenullish/nullish-db";
import { AdminServiceContext, type AdminServiceContextArgs } from "../../_service";

const plans = DbSchema.Subscription.Plans.PlansSchema;

type Plan = Records["Subscription"]["Plans"]["Select"];

export class PlansService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): PlansService {
    return new this(args);
  }

  list(): Promise<Result<Plan[]>> {
    return this._withDbContext((tx) =>
      selectMany({
        tx,
        table: plans,
        schema: RecordsSchema.Subscription.PlansSchema.SelectPlansSchema,
        orderBy: [asc(plans.expiresAt)],
      }),
    );
  }

  insert({ plan }: { plan: Records["Subscription"]["Plans"]["Insert"] }): Promise<Result<Plan>> {
    return this._withDbContext(async (tx) => {
      const values = RecordsSchema.Subscription.PlansSchema.InsertPlansSchema.parse(plan);

      const [row] = await insertMany({
        tx,
        table: plans,
        values,
        returningSchema: RecordsSchema.Subscription.PlansSchema.SelectPlansSchema,
      });

      assertNonNullish(row);

      return row;
    });
  }

  update({
    planId,
    plan,
  }: {
    planId: Plan["id"];
    plan: Records["Subscription"]["Plans"]["Update"];
  }): Promise<Result<Option<Plan>>> {
    return this._withDbContext(async (tx) => {
      const values = RecordsSchema.Subscription.PlansSchema.UpdatePlansSchema.parse(plan);

      const rows = await updateMany({
        tx,
        table: plans,
        values,
        returningSchema: RecordsSchema.Subscription.PlansSchema.SelectPlansSchema,
        where: eq(plans.id, planId),
      });

      assertArrayAtMostOne(rows);

      const [row] = rows;
      return row;
    });
  }
}
