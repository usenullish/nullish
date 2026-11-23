import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { PlanRulesSchema } from "../../../db/schemas/subscription/plan-rules";

export const SelectPlanRulesSchema = createSelectSchema(PlanRulesSchema);
export const InsertPlanRulesSchema = createInsertSchema(PlanRulesSchema).omit({
  id: true,
});
