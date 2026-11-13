import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("nodemailer", () => ({ createTransport: mock(() => ({})) }));
mock.module("@aws-sdk/client-sesv2", () => ({
  SESv2Client: mock(() => ({})),
  SendEmailCommand: mock(() => ({})),
}));

const { createMailProvider } = await import("../src/provider");
const { SmtpMailProvider } = await import("../src/_smtp");
const { AwsSesMailProvider } = await import("../src/_aws-ses");

describe("createMailProvider", () => {
  const KEYS = [
    "NULLISH_MAIL_FROM",
    "NULLISH_MAIL_SMTP_URL",
    "NULLISH_MAIL_SES_REGION",
    "NULLISH_MAIL_SES_ACCESS_KEY_ID",
    "NULLISH_MAIL_SES_SECRET_ACCESS_KEY",
  ] as const;

  const saved = new Map<string, string | undefined>();

  const setSmtp = () => {
    process.env.NULLISH_MAIL_SMTP_URL = "smtp://localhost:1025";
  };

  const setAwsSes = () => {
    process.env.NULLISH_MAIL_SES_REGION = "eu-central-2";
    process.env.NULLISH_MAIL_SES_ACCESS_KEY_ID = "access-key-id";
    process.env.NULLISH_MAIL_SES_SECRET_ACCESS_KEY = "secret-access-key";
  };

  beforeEach(() => {
    for (const key of KEYS) {
      saved.set(key, process.env[key]);
      delete process.env[key];
    }

    process.env.NULLISH_MAIL_FROM = "hello@nullish.example.com";
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

  test("returns the SMTP provider when SMTP is defined", () => {
    setSmtp();

    const result = createMailProvider();

    expect(result.status).toBe("success");
    expect(result.status === "success" && result.result).toBeInstanceOf(SmtpMailProvider);
  });

  test("returns the Amazon SES provider when Amazon SES is defined", () => {
    setAwsSes();

    const result = createMailProvider();

    expect(result.status).toBe("success");
    expect(result.status === "success" && result.result).toBeInstanceOf(AwsSesMailProvider);
  });

  test("returns an error when both SMTP and Amazon SES are defined", () => {
    setSmtp();
    setAwsSes();

    const result = createMailProvider();

    expect(result.status).toBe("error");
    expect(result.status === "error" && result.err).toEqual(
      new Error("Emails are sent with either SMTP or Amazon SES, not both."),
    );
  });

  test("returns an error when no provider is defined", () => {
    expect(createMailProvider().status).toBe("error");
  });
});
