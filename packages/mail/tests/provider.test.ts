import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";
import { MailType } from "@usenullish/nullish-schema/mail";

const sendMail = mock(async () => ({}));
const createTransport = mock(() => ({ sendMail }));

mock.module("nodemailer", () => ({ createTransport }));

const { createMailProvider } = await import("../src/provider");
const { SmtpMailProvider } = await import("../src/_smtp");

describe("createMailProvider", () => {
  const KEYS = ["NULLISH_MAIL_FROM", "NULLISH_MAIL_FROM_NAME", "NULLISH_MAIL_SMTP_URL"] as const;

  const saved = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of KEYS) {
      saved.set(key, process.env[key]);
    }

    process.env.NULLISH_MAIL_FROM = "hello@nullish.example.com";
    process.env.NULLISH_MAIL_FROM_NAME = "nullish";
    process.env.NULLISH_MAIL_SMTP_URL = "smtp://localhost:1025";

    sendMail.mockClear();
    createTransport.mockClear();
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

  const createProvider = () => {
    const result = createMailProvider();

    if (result.status === "error") {
      throw result.err;
    }

    return result.result;
  };

  test("returns the SMTP provider", () => {
    expect(createProvider()).toBeInstanceOf(SmtpMailProvider);
  });

  test("creates the transport with the SMTP URL", () => {
    createProvider();

    expect(createTransport).toHaveBeenCalledWith("smtp://localhost:1025");
  });

  test.each([
    ["NULLISH_MAIL_FROM", "hello"],
    ["NULLISH_MAIL_FROM", ""],
    ["NULLISH_MAIL_SMTP_URL", "https://smtp.example.com"],
    ["NULLISH_MAIL_SMTP_URL", ""],
  ])("returns an error when %s is %p", (key, value) => {
    process.env[key] = value;

    expect(createMailProvider().status).toBe("error");
  });

  describe("send", () => {
    const args = {
      type: MailType.VERIFY_EMAIL,
      to: "user@nullish.example.com",
      url: "https://nullish.example.com/auth/verify?token=abc",
    } as const;

    test("sends from the name and the address of the sender", async () => {
      await createProvider().send(args);

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          from: { name: "nullish", address: "hello@nullish.example.com" },
          to: "user@nullish.example.com",
        }),
      );
    });

    test("sends from the address only when the sender has no name", async () => {
      delete process.env.NULLISH_MAIL_FROM_NAME;

      await createProvider().send(args);

      expect(sendMail).toHaveBeenCalledWith(
        expect.objectContaining({ from: "hello@nullish.example.com" }),
      );
    });

    test("rejects invalid arguments without sending", async () => {
      const provider = createProvider();

      await expect(provider.send({ ...args, to: "user" })).rejects.toThrow();

      expect(sendMail).not.toHaveBeenCalled();
    });

    test("rethrows when the transport fails", async () => {
      sendMail.mockImplementationOnce(async () => {
        throw new Error("Connection refused");
      });

      await expect(createProvider().send(args)).rejects.toThrow("Connection refused");
    });
  });
});
