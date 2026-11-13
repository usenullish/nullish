import { type Result, tryCatchSync } from "@usenullish/nullish-common";
import { envMailAwsSesEnabled, envMailSmtpEnabled } from "@usenullish/nullish-env";
import type { SendMail } from "@usenullish/nullish-schema/mail";
import { AwsSesMailProvider } from "./_aws-ses";
import { SmtpMailProvider } from "./_smtp";

export const createMailProvider = (): Result<SendMail> => {
  return tryCatchSync(() => {
    if (envMailSmtpEnabled() && envMailAwsSesEnabled()) {
      throw new Error("Emails are sent with either SMTP or Amazon SES, not both.");
    }

    return envMailAwsSesEnabled() ? AwsSesMailProvider.create() : SmtpMailProvider.create();
  });
};
