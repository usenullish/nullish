import * as z from "zod";
import { isNullish, type Option, preferredLanguage } from "@usenullish/nullish-common";
import { DefaultTemplateLanguage } from "@usenullish/nullish-schema/db";
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
    request,
  }: {
    type: MailType.VERIFY_EMAIL | MailType.RESET_PASSWORD;
    email: SendMailArgs["to"];
    url: SendMailArgs["url"];
    request: Option<Request>;
  }): void {
    const reservation = this.#limiter.reserve({ email });

    if (reservation === MailReservationType.LIMIT_REACHED) {
      console.warn(`The rate limit of the ${type} emails was reached for an address.`);
      return;
    }

    const lang =
      (isNullish(request)
        ? undefined
        : preferredLanguage({ request, languages: z.enum(DefaultTemplateLanguage) })) ??
      DefaultTemplateLanguage.EN;

    // The result is not awaited so that the response time does not reveal whether an email exists (timing attacks),
    // hence errors are caught and logged here.
    // @see https://better-auth.com/docs/concepts/email
    this.#mail.send({ type, to: email, lang, url }).catch((err: unknown) => {
      console.error("Unexpected error while sending an email", err);
    });
  }
}
