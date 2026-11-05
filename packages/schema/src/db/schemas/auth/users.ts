import * as pg from "drizzle-orm/pg-core";
import { users } from "./auth";

export const UsersSchema = users;

export const authUserIdReferenceOptional = ({
  onDelete,
}: {
  onDelete?: "cascade" | "set null";
} = {}) => pg.text().references(() => UsersSchema.id, { onDelete });

export const authUserIdReference = () =>
  authUserIdReferenceOptional({ onDelete: "cascade" }).notNull();
