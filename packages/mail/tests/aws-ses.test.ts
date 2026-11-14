import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { DefaultTemplateLanguage } from "@usenullish/nullish-schema/db";
import { MailType } from "@usenullish/nullish-schema/mail";

const send = mock(async () => ({}));
const SESv2Client = mock(() => ({ send }));
const SendEmailCommand = mock((input: unknown) => ({ input }));

mock.module("@aws-sdk/client-sesv2", () => ({ SESv2Client, SendEmailCommand }));

const { AwsSesMailProvider } = await import("../src/_aws-ses");

describe("AwsSesMailProvider", () => {
  const KEYS = [
    "NULLISH_MAIL_FROM",
    "NULLISH_MAIL_FROM_NAME",
    "NULLISH_MAIL_SES_REGION",
    "NULLISH_MAIL_SES_ACCESS_KEY_ID",
    "NULLISH_MAIL_SES_SECRET_ACCESS_KEY",
  ] as const;

  const saved = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of KEYS) {
      saved.set(key, process.env[key]);
    }

    process.env.NULLISH_MAIL_FROM = "hello@nullish.example.com";
    process.env.NULLISH_MAIL_FROM_NAME = "nullish";
    process.env.NULLISH_MAIL_SES_REGION = "eu-central-2";
    process.env.NULLISH_MAIL_SES_ACCESS_KEY_ID = "access-key-id";
    process.env.NULLISH_MAIL_SES_SECRET_ACCESS_KEY = "secret-access-key";

    send.mockClear();
    SESv2Client.mockClear();
    SendEmailCommand.mockClear();
  });

  afterEach(() => {
    for (const key of KEYS) {
      const value = saved.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  test("creates the client with the region and the credentials", () => {
    AwsSesMailProvider.create();

    expect(SESv2Client).toHaveBeenCalledWith({
      region: "eu-central-2",
      credentials: { accessKeyId: "access-key-id", secretAccessKey: "secret-access-key" },
    });
  });

  test.each([
    ["NULLISH_MAIL_FROM", "hello"],
    ["NULLISH_MAIL_FROM", ""],
    ["NULLISH_MAIL_SES_REGION", ""],
    ["NULLISH_MAIL_SES_ACCESS_KEY_ID", ""],
    ["NULLISH_MAIL_SES_SECRET_ACCESS_KEY", ""],
  ])("throws when %s is %p", (key, value) => {
    process.env[key] = value;

    expect(() => AwsSesMailProvider.create()).toThrow();
  });

  describe("send", () => {
    const args = {
      type: MailType.VERIFY_EMAIL,
      to: "user@nullish.example.com",
      lang: DefaultTemplateLanguage.EN,
      url: "https://nullish.example.com/auth/verify?token=abc",
    } as const;

    test("sends the rendered email from the name and the address of the sender", async () => {
      await AwsSesMailProvider.create().send(args);

      expect(SendEmailCommand).toHaveBeenCalledWith({
        FromEmailAddress: '"nullish" <hello@nullish.example.com>',
        Destination: { ToAddresses: ["user@nullish.example.com"] },
        Content: {
          Simple: {
            Subject: { Data: "Verify your email address" },
            Body: {
              Text: { Data: expect.stringContaining(args.url) },
              Html: { Data: expect.stringContaining(args.url) },
            },
          },
        },
      });
      expect(send).toHaveBeenCalledTimes(1);
    });

    test("sends from the address only when the sender has no name", async () => {
      delete process.env.NULLISH_MAIL_FROM_NAME;

      await AwsSesMailProvider.create().send(args);

      expect(SendEmailCommand).toHaveBeenCalledWith(
        expect.objectContaining({ FromEmailAddress: "hello@nullish.example.com" }),
      );
    });

    test("rejects invalid arguments without sending", async () => {
      const provider = AwsSesMailProvider.create();

      await expect(provider.send({ ...args, to: "user" })).rejects.toThrow();

      expect(send).not.toHaveBeenCalled();
    });

    test("rethrows when Amazon SES fails", async () => {
      send.mockImplementationOnce(async () => {
        throw new Error("Throttling");
      });

      await expect(AwsSesMailProvider.create().send(args)).rejects.toThrow("Throttling");
    });
  });
});
