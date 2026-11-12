import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { MailType, type SendMail } from "@usenullish/nullish-schema/mail";
import { MAIL_RATE_LIMITS } from "../../src/_constants";
import { AuthMailer } from "../../src/server/_mail/mailer";

describe("AuthMailer", () => {
  const args = {
    type: MailType.VERIFY_EMAIL,
    email: "test@test.dev",
    url: "https://nullish.example.com/auth/verify-email?token=abc",
  };

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
      url: "https://nullish.example.com/auth/verify-email?token=abc",
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
