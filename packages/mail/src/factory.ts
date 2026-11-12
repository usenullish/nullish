import type { MailProvider } from "./provider";
import { SmtpMailProvider } from "./smtp/provider";

export const createMailProvider = (): MailProvider => SmtpMailProvider.create();
