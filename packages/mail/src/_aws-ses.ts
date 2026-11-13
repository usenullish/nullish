import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import { isNullish } from "@usenullish/nullish-common";
import {
  envMailAwsSesAccessKeyId,
  envMailAwsSesRegion,
  envMailAwsSesSecretAccessKey,
  envMailFrom,
  envMailFromName,
} from "@usenullish/nullish-env";
import { MailSchema, type Mail as MailTypes, type SendMail } from "@usenullish/nullish-schema/mail";
import { MailFactory } from "./_factory";

@MailFactory
export class AwsSesMailProvider implements SendMail {
  readonly #client: SESv2Client;
  readonly #from: string;

  private constructor() {
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

  async send(args: MailTypes["Send"]["Args"]): Promise<void> {
    const { type, to, url } = MailSchema.SendMailArgsSchema.parse(args);

    await this.#client.send(
      new SendEmailCommand({
        FromEmailAddress: this.#from,
        Destination: { ToAddresses: [to] },
        Content: {
          Simple: {
            Subject: { Data: type },
            Body: { Text: { Data: url }, Html: { Data: url } },
          },
        },
      }),
    );
  }
}
