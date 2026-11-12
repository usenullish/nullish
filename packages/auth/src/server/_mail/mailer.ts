import type { Mail, MailType, SendMail } from "@usenullish/nullish-schema/mail";
import { MailRateLimiter, MailReservationType } from "./_rate-limiter";

type SendMailArgs = Mail["Send"]["Args"];

export class AuthMailer {
  readonly #limiter = MailRateLimiter.create();
  readonly #mail: SendMail;

  private constructor({ mail }: { mail: SendMail }) {
    this.#mail = mail;
  }

  static create(args: { mail: SendMail }): AuthMailer {
    return new this(args);
  }

  send({
    type,
    email,
    url,
  }: {
    type: MailType;
    email: SendMailArgs["to"];
    url: SendMailArgs["url"];
  }): void {
    const reservation = this.#limiter.reserve({ email });

    if (reservation === MailReservationType.LIMIT_REACHED) {
      console.warn(`The rate limit of the ${type} emails was reached for an address.`);
      return;
    }

    // The result is not awaited so that the response time does not reveal whether an email exists (timing attacks),
    // hence errors are caught and logged here.
    // @see https://better-auth.com/docs/concepts/email
    this.#mail.send({ type, to: email, url }).catch((err: unknown) => {
      console.error("Unexpected error while sending an email", err);
    });
  }
}
