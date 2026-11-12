import { type Result, tryCatchSync } from "@usenullish/nullish-common";
import type { SendMail } from "@usenullish/nullish-schema/mail";
import { SmtpMailProvider } from "./_smtp";

export const createMailProvider = (): Result<SendMail> =>
  tryCatchSync(() => SmtpMailProvider.create());
