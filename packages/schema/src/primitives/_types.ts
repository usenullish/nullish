import type { CommonSchema } from "./_schemas";
import type { z } from "zod";

interface Common {
  PostgresUrl: z.infer<typeof CommonSchema.Url.PostgresUrlSchema>;
}

export type { Common };
