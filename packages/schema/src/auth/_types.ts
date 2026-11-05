import type { AuthSchema } from "./_schemas";
import type { z } from "zod";

interface Auth {
  ApiKeys: {
    Permissions: z.infer<typeof AuthSchema.ApiKeysSchema.ApiKeyPermissionsSchema>;
  };
}

export type { Auth };
