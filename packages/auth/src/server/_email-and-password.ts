import type { BetterAuthOptions } from "better-auth";
import { MailType, type SendMail } from "@usenullish/nullish-schema/mail";
import { AuthMailer } from "./_mail/mailer";

export type SignIn = { mail: SendMail } | { autoSignIn: boolean };

export const buildEmailAndPasswordConfig = ({
  signIn,
}: {
  signIn: SignIn;
}): Pick<BetterAuthOptions, "emailAndPassword" | "emailVerification"> => {
  if ("autoSignIn" in signIn) {
    return {
      emailAndPassword: {
        enabled: true,
        autoSignIn: signIn.autoSignIn,
      },
    };
  }

  const mailer = AuthMailer.create({ mail: signIn.mail });

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
