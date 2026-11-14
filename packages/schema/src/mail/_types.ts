import type { MailSchema } from "./_schemas";
import type { SendMail } from "./_send";
import type { z } from "zod";

interface Mail {
  Send: {
    Args: z.infer<typeof MailSchema.SendMailArgsSchema>;
  };
  Deliver: {
    Args: z.infer<typeof MailSchema.DeliverMailArgsSchema>;
  };
}

export type { Mail, SendMail };
