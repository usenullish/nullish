import { snakeCase } from "drizzle-orm/pg-core";

export const ChatSchema = snakeCase.schema("chat");
