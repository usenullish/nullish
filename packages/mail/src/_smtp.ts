import { createTransport, type SendMailOptions, type Transporter } from "nodemailer";
import { isNullish } from "@usenullish/nullish-common";
import { envMailFrom, envMailFromName, envMailSmtpUrl } from "@usenullish/nullish-env";
import { MailSchema, type Mail as MailTypes, type SendMail } from "@usenullish/nullish-schema/mail";
import { MailFactory } from "./_factory";

@MailFactory
export class SmtpMailProvider implements SendMail {
  readonly #transporter: Transporter;
  readonly #from: SendMailOptions["from"];

  private constructor() {
    this.#transporter = createTransport(envMailSmtpUrl());

    const address = envMailFrom();
    const name = envMailFromName();

    this.#from = isNullish(name) ? address : { name, address };
  }

  static create(): SmtpMailProvider {
    return new this();
  }

  async send(args: MailTypes["Send"]["Args"]): Promise<void> {
    const { type, to, url } = MailSchema.SendMailArgsSchema.parse(args);

    await this.#transporter.sendMail({ from: this.#from, to, subject: type, text: url, html: url });
  }
}
