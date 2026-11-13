import {
  assertNotEmptyString,
  isEmptyString,
  notEmptyString,
  type Option,
} from "@usenullish/nullish-common";
import * as z from "zod";

const MailFromSchema = z.email({
  error: "The sender of the emails must be a valid email address.",
});

const MailSmtpUrlSchema = z.url({
  protocol: /^smtps?$/,
  error: "The SMTP URL of the emails must be a valid smtp:// or smtps:// URL.",
});

export const envMailSmtpEnabled = (): boolean => notEmptyString(process.env.NULLISH_MAIL_SMTP_URL);

export const envMailAwsSesEnabled = (): boolean =>
  [
    process.env.NULLISH_MAIL_SES_REGION,
    process.env.NULLISH_MAIL_SES_ACCESS_KEY_ID,
    process.env.NULLISH_MAIL_SES_SECRET_ACCESS_KEY,
  ].every(notEmptyString);

export const envMailEnabled = (): boolean =>
  notEmptyString(process.env.NULLISH_MAIL_FROM) && (envMailSmtpEnabled() || envMailAwsSesEnabled());

export const envMailFrom = (): string => MailFromSchema.parse(process.env.NULLISH_MAIL_FROM);

export const envMailFromName = (): Option<string> => {
  const name = process.env.NULLISH_MAIL_FROM_NAME;
  return isEmptyString(name) ? undefined : name;
};

export const envMailSmtpUrl = (): string =>
  MailSmtpUrlSchema.parse(process.env.NULLISH_MAIL_SMTP_URL);

export const envMailAwsSesRegion = (): string => {
  const region = process.env.NULLISH_MAIL_SES_REGION;
  assertNotEmptyString(region, "A region for Amazon SES must be defined.");
  return region;
};

export const envMailAwsSesAccessKeyId = (): string => {
  const accessKeyId = process.env.NULLISH_MAIL_SES_ACCESS_KEY_ID;
  assertNotEmptyString(accessKeyId, "An access key ID for Amazon SES must be defined.");
  return accessKeyId;
};

export const envMailAwsSesSecretAccessKey = (): string => {
  const secretAccessKey = process.env.NULLISH_MAIL_SES_SECRET_ACCESS_KEY;
  assertNotEmptyString(secretAccessKey, "A secret access key for Amazon SES must be defined.");
  return secretAccessKey;
};
