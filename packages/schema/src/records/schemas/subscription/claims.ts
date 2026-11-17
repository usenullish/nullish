import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { ClaimsSchema } from "../../../db/schemas/subscription/claims";

export const SelectClaimsSchema = createSelectSchema(ClaimsSchema);
export const InsertClaimsSchema = createInsertSchema(ClaimsSchema).omit({ id: true });
export const UpdateClaimsSchema = createUpdateSchema(ClaimsSchema).omit({ id: true });
