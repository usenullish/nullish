import { createSelectSchema } from "drizzle-orm/zod";
import { UsersSchema } from "../../../db/schemas/auth/users";

export const SelectUsersSchema = createSelectSchema(UsersSchema);
