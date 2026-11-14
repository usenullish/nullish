import { createTransport, type SendMailOptions, type Transporter } from "nodemailer";
import { isNullish } from "@usenullish/nullish-common";
import { envMailFrom, envMailFromName, envMailSmtpUrl } from "@usenullish/nullish-env";
import { MailFactory } from "./_factory";
import type { Mail as MailTypes } from "@usenullish/nullish-schema/mail";
import { MailProvider } from "./_mail-provider";

@MailFactory
export class SmtpMailProvider extends MailProvider {
  readonly #transporter: Transporter;
  readonly #from: SendMailOptions["from"];

  protected constructor() {
    super();

    this.#transporter = createTransport(envMailSmtpUrl());

    const address = envMailFrom();
    const name = envMailFromName();

    this.#from = isNullish(name) ? address : { name, address };
  }

  static create(): SmtpMailProvider {
    return new this();
  }

  override async deliver({ to, subject, html, text }: MailTypes["Deliver"]["Args"]): Promise<void> {
    await this.#transporter.sendMail({
      from: this.#from,
      to,
      subject,
      text,
      html,
    });
  }
}
