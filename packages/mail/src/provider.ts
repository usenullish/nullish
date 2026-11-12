import type { SendMail } from "@usenullish/nullish-schema/mail";
import { SmtpMailProvider } from "./_smtp";

export const createMailProvider = (): SendMail => SmtpMailProvider.create();
