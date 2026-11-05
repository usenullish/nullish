import type { StorageSchema } from "./_schemas";
import type { z } from "zod";

interface Storage {
  Put: {
    Args: z.infer<typeof StorageSchema.StoragePutArgsSchema>;
  };
  Get: {
    Args: z.infer<typeof StorageSchema.StorageGetArgsSchema>;
    Result: z.infer<typeof StorageSchema.StorageGetResultSchema>;
  };
  Delete: {
    Args: z.infer<typeof StorageSchema.StorageDeleteArgsSchema>;
  };
}

export type { Storage };
