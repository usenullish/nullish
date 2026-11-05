import { createSelectSchema } from "drizzle-orm/zod";
import { ApiKeysSchema } from "../../../db/schemas/auth/api-keys";

export const SelectApiKeysSchema = createSelectSchema(ApiKeysSchema);
