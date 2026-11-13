import type { BetterAuthOptions } from "better-auth";
import { MailType, type SendMail } from "@usenullish/nullish-schema/mail";
import { API_PATH } from "@usenullish/nullish-schema/server";
import { type Result, tryCatchSync } from "@usenullish/nullish-common";
import { AuthMailer } from "./_mail/mailer";

export type EmailAndPassword = { mail: SendMail } | { autoSignIn: boolean };

// The client uses /api/auth proxy to communicate with the server. The URL sent per mail are public facing
// and therefore needs to include such prefix which are unknown by the server or by the configuration of better-auth
// on the server side.
const buildApiPrefixedUrl = ({ url }: { url: string }): Result<URL["href"]> => {
  return tryCatchSync(() => {
    const { origin, pathname, search } = new URL(url);
    return `${origin}${API_PATH}${pathname}${search}`;
  });
};

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
        const linkResult = buildApiPrefixedUrl({ url });

        if (linkResult.status === "error") {
          console.error("Cannot build the link of the reset password email.", linkResult.err);
          return;
        }

        mailer.send({ type: MailType.RESET_PASSWORD, email, url: linkResult.result });
      },
    },
    emailVerification: {
      autoSignInAfterVerification: true,
      sendOnSignIn: true,
      sendVerificationEmail: async ({ user: { email }, url }) => {
        const linkResult = buildApiPrefixedUrl({ url });

        if (linkResult.status === "error") {
          console.error("Cannot build the link of the verify email email.", linkResult.err);
          return;
        }

        mailer.send({ type: MailType.VERIFY_EMAIL, email, url: linkResult.result });
      },
    },
  };
};
