import { isEmptyString, notEmptyString, type Option } from "@usenullish/nullish-common";
import * as z from "zod";

const MailFromSchema = z.email({
  error: "The sender of the emails must be a valid email address.",
});

const MailSmtpUrlSchema = z.url({
  protocol: /^smtps?$/,
  error: "The SMTP URL of the emails must be a valid smtp:// or smtps:// URL.",
});

export const envMailEnabled = (): boolean =>
  [process.env.NULLISH_MAIL_FROM, process.env.NULLISH_MAIL_SMTP_URL].every(notEmptyString);

export const envMailFrom = (): string => MailFromSchema.parse(process.env.NULLISH_MAIL_FROM);

export const envMailFromName = (): Option<string> => {
  const name = process.env.NULLISH_MAIL_FROM_NAME;
  return isEmptyString(name) ? undefined : name;
};

export const envMailSmtpUrl = (): string =>
  MailSmtpUrlSchema.parse(process.env.NULLISH_MAIL_SMTP_URL);
