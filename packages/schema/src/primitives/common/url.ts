import * as z from "zod";

// `postgresql://${username}:${password}@${host}:${port}/${db_name}`
export const PostgresUrlSchema = z.templateLiteral([
  "postgresql://",
  z.string(),
  ":",
  z.string(),
  "@",
  z.string(),
  ":",
  z.number(),
  "/",
  z.string(),
]);

export type PostgresUrl = z.infer<typeof PostgresUrlSchema>;
