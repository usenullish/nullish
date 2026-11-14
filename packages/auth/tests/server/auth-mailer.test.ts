import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { DefaultTemplateLanguage } from "@usenullish/nullish-schema/db";
import { type Mail, MailType, type SendMail } from "@usenullish/nullish-schema/mail";
import { MAIL_RATE_LIMITS } from "../../src/_constants";
import { AuthMailer } from "../../src/server/_mail/mailer";

describe("AuthMailer", () => {
  const args = {
    type: MailType.VERIFY_EMAIL,
    email: "test@test.dev",
    url: "https://nullish.example.com/auth/verify-email?token=abc",
    request: undefined,
  } as const;

  let consoleError: ReturnType<typeof spyOn>;
  let consoleWarn: ReturnType<typeof spyOn>;

  beforeEach(() => {
    consoleError = spyOn(console, "error").mockImplementation(() => {});
    consoleWarn = spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  test("sends the email of the type to the address with the url", () => {
    const send = mock(async () => {});

    AuthMailer.create({ mail: { send } }).send(args);

    expect(send).toHaveBeenCalledWith({
      type: MailType.VERIFY_EMAIL,
      to: "test@test.dev",
      lang: DefaultTemplateLanguage.EN,
      url: "https://nullish.example.com/auth/verify-email?token=abc",
    });
  });

  describe("language", () => {
    const sentLang = (request: Request | undefined) => {
      const send = mock(async (_args: Mail["Send"]["Args"]) => {});

      AuthMailer.create({ mail: { send } }).send({ ...args, request });

      return send.mock.calls[0]?.[0].lang;
    };

    const request = (acceptLanguage: string) =>
      new Request("https://nullish.example.com", {
        headers: { "Accept-Language": acceptLanguage },
      });

    test.each([
      ["fr-CH,fr;q=0.9,en;q=0.8", DefaultTemplateLanguage.FR],
      ["de", DefaultTemplateLanguage.DE],
      ["es-ES,it;q=0.9", DefaultTemplateLanguage.IT],
    ] as const)("sends in the preferred language of %p", (acceptLanguage, lang) => {
      expect(sentLang(request(acceptLanguage))).toBe(lang);
    });

    test("sends in English when no language of the request is supported", () => {
      expect(sentLang(request("es-ES,ja"))).toBe(DefaultTemplateLanguage.EN);
    });

    test("sends in English without request", () => {
      expect(sentLang(undefined)).toBe(DefaultTemplateLanguage.EN);
    });
  });

  test("returns before the email is sent", () => {
    const { promise, resolve } = Promise.withResolvers<void>();

    const mail: SendMail = { send: () => promise };

    expect(AuthMailer.create({ mail }).send(args)).toBeUndefined();

    resolve();
  });

  test("logs the error without throwing when the email cannot be sent", async () => {
    const error = new Error("Connection refused");

    const mail: SendMail = { send: async () => Promise.reject(error) };

    expect(() => AuthMailer.create({ mail }).send(args)).not.toThrow();

    await Bun.sleep(0);

    expect(consoleError).toHaveBeenCalledWith("Unexpected error while sending an email", error);
  });

  describe("rate limit", () => {
    const { maxRequests } = MAIL_RATE_LIMITS.burst;

    test("does not send once the limit of the address is reached", () => {
      const send = mock(async () => {});

      const mailer = AuthMailer.create({ mail: { send } });

      Array.from({ length: maxRequests + 1 }, () => mailer.send(args));

      expect(send).toHaveBeenCalledTimes(maxRequests);
    });

    test("warns without the address once the limit is reached", () => {
      const mailer = AuthMailer.create({ mail: { send: async () => {} } });

      Array.from({ length: maxRequests + 1 }, () => mailer.send(args));

      expect(consoleWarn).toHaveBeenCalledTimes(1);
      expect(consoleWarn.mock.calls[0]?.join(" ")).not.toContain(args.email);
    });

    test("counts the emails of each mailer separately", () => {
      const send = mock(async () => {});

      Array.from({ length: maxRequests }, () =>
        AuthMailer.create({ mail: { send: async () => {} } }).send(args),
      );

      AuthMailer.create({ mail: { send } }).send(args);

      expect(send).toHaveBeenCalledTimes(1);
    });
  });
});
