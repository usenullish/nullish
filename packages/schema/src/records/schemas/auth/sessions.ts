import { createSelectSchema } from "drizzle-orm/zod";
import { SessionsSchema } from "../../../db/schemas/auth/sessions";

export const SelectSessionsSchema = createSelectSchema(SessionsSchema);
