import { asc, eq } from "drizzle-orm";
import {
  assertArrayAtMostOne,
  isNullish,
  type Nullable,
  type Option,
  type Result,
} from "@usenullish/nullish-common";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { updateMany } from "@usenullish/nullish-db";
import { AdminServiceContext, type AdminServiceContextArgs } from "../../_service";
import { insertPlanRules } from "../_helpers/plan-rules";
import { insertPlan } from "../_helpers/plans";

const plans = DbSchema.Subscription.Plans.PlansSchema;
const planRules = DbSchema.Subscription.PlanRules.PlanRulesSchema;

type Plan = Records["Subscription"]["Plans"]["Select"];

export type PlanWithRules = Plan & {
  maxMembers: Nullable<Records["Subscription"]["PlanRules"]["Select"]["maxMembers"]>;
};

export class PlansService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): PlansService {
    return new this(args);
  }

  list(): Promise<Result<PlanWithRules[]>> {
    return this._withDbContext(async (tx) => {
      const rows = await tx
        .select({ plan: plans, maxMembers: planRules.maxMembers })
        .from(plans)
        .leftJoin(planRules, eq(planRules.id, plans.planRulesId))
        .orderBy(asc(plans.expiresAt));

      return rows.map(({ plan, maxMembers }) => ({
        ...RecordsSchema.Subscription.PlansSchema.SelectPlansSchema.parse(plan),
        maxMembers,
      }));
    });
  }

  insert({
    plan,
    rules,
  }: {
    plan: Omit<Records["Subscription"]["Plans"]["Insert"], "planRulesId">;
    rules?: Records["Subscription"]["PlanRules"]["Insert"];
  }): Promise<Result<Plan>> {
    return this._withDbContext(async (tx) => {
      const planRulesId = isNullish(rules)
        ? null
        : (
            await insertPlanRules({
              tx,
              rules: RecordsSchema.Subscription.PlanRulesSchema.InsertPlanRulesSchema.parse(rules),
            })
          ).id;

      const values = RecordsSchema.Subscription.PlansSchema.InsertPlansSchema.parse({
        ...plan,
        planRulesId,
      });

      return await insertPlan({ tx, plan: values });
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
