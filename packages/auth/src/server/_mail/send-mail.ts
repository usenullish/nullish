import type { MailType, SendMail } from "@usenullish/nullish-schema/mail";

export const sendMail = ({
  mail,
  type,
  email,
  url,
}: {
  mail: SendMail;
  type: MailType;
  email: string;
  url: string;
}): void => {
  // The result is not awaited so that the response time does not reveal whether an email exists (timing attacks),
  // hence errors are caught and logged here.
  // @see https://better-auth.com/docs/concepts/email
  mail.send({ type, to: email, url }).catch((err: unknown) => {
    console.error("Unexpected error while sending an email", err);
  });
};
