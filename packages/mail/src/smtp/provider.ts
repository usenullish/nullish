import { createTransport, type Transporter } from "nodemailer";
import { envMailFrom, envMailFromName, envMailSmtpUrl } from "@usenullish/nullish-env";
import { type DeliverArgs, MailProvider } from "../provider";

export class SmtpMailProvider extends MailProvider {
  readonly #transporter: Transporter;
  readonly #from: string | { name: string; address: string };

  private constructor() {
    super();

    this.#transporter = createTransport(envMailSmtpUrl());

    const address = envMailFrom();
    const name = envMailFromName();

    this.#from = name === undefined ? address : { name, address };
  }

  static create(): SmtpMailProvider {
    return new this();
  }

  protected override async deliver(args: DeliverArgs): Promise<void> {
    await this.#transporter.sendMail({ ...args, from: this.#from });
  }
}
