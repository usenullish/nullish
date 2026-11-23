import { createInsertSchema, createSelectSchema } from "drizzle-orm/zod";
import { InstanceRulesSchema } from "../../../db/schemas/instance/instance-rules";

export const SelectInstanceRulesSchema = createSelectSchema(InstanceRulesSchema);
export const InsertInstanceRulesSchema = createInsertSchema(InstanceRulesSchema).omit({ id: true });
