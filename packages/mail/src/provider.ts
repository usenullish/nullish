import { MailSchema, type Mail } from "@usenullish/nullish-schema/mail";

export interface DeliverArgs {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export abstract class MailProvider {
  async send(args: Mail["Send"]["Args"]): Promise<void> {
    const { type, to, url } = MailSchema.SendMailArgsSchema.parse(args);

    await this.deliver({ to, subject: type, text: url, html: url });
  }

  protected abstract deliver(args: DeliverArgs): Promise<void>;
}
