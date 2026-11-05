import * as z from "zod";
import { RecordsSchema } from "../../records";

export const ScheduledJobSchema = z.strictObject({
  jobId: z.uuid(),
});

export const JobPayloadSchema = z.strictObject({
  userId: RecordsSchema.Auth.UsersSchema.SelectUsersSchema.shape.id,
});

// A job without result returns null because BullMQ stores a missing (undefined) result as null anyway.
export const EmptyJobResultSchema = z.null();
