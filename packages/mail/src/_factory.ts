import type { SendMail } from "@usenullish/nullish-schema/mail";

interface Factory<T> {
  create(): T;
}

export function MailFactory(_constructor: Factory<SendMail>) {}
