import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { isNullish } from "@usenullish/nullish-common";
import {
  envMailAwsSesAccessKeyId,
  envMailAwsSesRegion,
  envMailAwsSesSecretAccessKey,
  envMailFrom,
  envMailFromName,
} from "@usenullish/nullish-env";
import { MailFactory } from "./_factory";
import type { Mail as MailTypes } from "@usenullish/nullish-schema/mail";
import { MailProvider } from "./_mail-provider";

@MailFactory
export class AwsSesMailProvider extends MailProvider {
  readonly #client: SESv2Client;
  readonly #from: string;

  protected constructor() {
    super();

    this.#client = new SESv2Client({
      region: envMailAwsSesRegion(),
      credentials: {
        accessKeyId: envMailAwsSesAccessKeyId(),
        secretAccessKey: envMailAwsSesSecretAccessKey(),
      },
    });

    const address = envMailFrom();
    const name = envMailFromName();

    this.#from = isNullish(name) ? address : `"${name}" <${address}>`;
  }

  static create(): AwsSesMailProvider {
    return new this();
  }

  override async deliver({ to, subject, html, text }: MailTypes["Deliver"]["Args"]): Promise<void> {
    await this.#client.send(
      new SendEmailCommand({
        FromEmailAddress: this.#from,
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: subject },
            Body: { Text: { Data: text }, Html: { Data: html } },
          },
        },
      }),
    );
  }
}
