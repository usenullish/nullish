import * as z from "zod";

export function createScheduledJobStateSchema<ResultSchema extends z.ZodType>({
  schema,
}: {
  schema: ResultSchema;
}) {
  return z.discriminatedUnion("status", [
    z.strictObject({
      status: z.literal("completed"),
      result: schema,
    }),
    z.strictObject({
      status: z.literal("failed"),
      reason: z.string().optional(),
    }),
    z.strictObject({
      status: z.enum([
        "unknown",
        "active",
        "delayed",
        "prioritized",
        "waiting",
        "waiting-children",
      ]),
    }),
  ]);
}
