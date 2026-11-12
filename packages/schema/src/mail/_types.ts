import type { MailSchema } from "./_schemas";
import type { z } from "zod";

interface Mail {
  Send: {
    Args: z.infer<typeof MailSchema.SendMailArgsSchema>;
  };
}

export type { Mail };
