import { snakeCase } from "drizzle-orm/pg-core";

export const MeteringSchema = snakeCase.schema("metering");
