import type { z } from "zod";
import type { MailSchema } from "./_schemas";

type SendMailArgs = z.infer<typeof MailSchema.SendMailArgsSchema>;

export interface SendMail {
  send(args: SendMailArgs): Promise<void>;
}
