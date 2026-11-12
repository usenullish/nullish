import type { BetterAuthOptions } from "better-auth";
import { MailType, type SendMail } from "@usenullish/nullish-schema/mail";
import { AuthMailer } from "./_mail/mailer";

export type EmailAndPassword = { mail: SendMail } | { autoSignIn: boolean };

export const buildEmailAndPasswordConfig = ({
  emailAndPassword,
}: {
  emailAndPassword: EmailAndPassword;
}): Pick<BetterAuthOptions, "emailAndPassword" | "emailVerification"> => {
  if ("autoSignIn" in emailAndPassword) {
    return {
      emailAndPassword: {
        enabled: true,
        autoSignIn: emailAndPassword.autoSignIn,
      },
    };
  }

  const mailer = AuthMailer.create({ mail: emailAndPassword.mail });

  return {
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user: { email }, url }) => {
        mailer.send({ type: MailType.RESET_PASSWORD, email, url });
      },
    },
    emailVerification: {
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user: { email }, url }) => {
        mailer.send({ type: MailType.VERIFY_EMAIL, email, url });
      },
    },
  };
};
