import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { MailType, type SendMail } from "@usenullish/nullish-schema/mail";
import { sendMail } from "../../src/server/_mail/send-mail";

describe("sendMail", () => {
  const args = {
    type: MailType.VERIFY_EMAIL,
    email: "test@test.dev",
    url: "https://nullish.example.com/auth/verify-email?token=abc",
  };

  let consoleError: ReturnType<typeof spyOn>;

  beforeEach(() => {
    consoleError = spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleError.mockRestore();
  });

  test("sends the email of the type to the address with the url", () => {
    const send = mock(async () => {});

    sendMail({ mail: { send }, ...args });

    expect(send).toHaveBeenCalledWith({
      type: MailType.VERIFY_EMAIL,
      to: "test@test.dev",
      url: "https://nullish.example.com/auth/verify-email?token=abc",
    });
  });

  test("returns before the email is sent", () => {
    const { promise, resolve } = Promise.withResolvers<void>();

    const mail: SendMail = { send: () => promise };

    expect(sendMail({ mail, ...args })).toBeUndefined();

    resolve();
  });

  test("logs the error without throwing when the email cannot be sent", async () => {
    const error = new Error("Connection refused");

    const mail: SendMail = { send: async () => Promise.reject(error) };

    expect(() => sendMail({ mail, ...args })).not.toThrow();

    await Bun.sleep(0);

    expect(consoleError).toHaveBeenCalledWith("Unexpected error while sending an email", error);
  });
});
