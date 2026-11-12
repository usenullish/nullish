import { describe, expect, test } from "bun:test";
import { MailType } from "../../src/mail/constants";
import { SendMailArgsSchema } from "../../src/mail/schemas/mail";

describe("SendMailArgsSchema", () => {
  const valid = {
    to: "hello@nullish.example.com",
    url: "https://nullish.example.com/auth/verify?token=abc",
  };

  test.each(Object.values(MailType))("accepts the type %p", (type) => {
    expect(SendMailArgsSchema.safeParse({ ...valid, type }).success).toBeTrue();
  });

  test("rejects an unknown type", () => {
    expect(SendMailArgsSchema.safeParse({ ...valid, type: "newsletter" }).success).toBeFalse();
  });

  test("rejects a missing type", () => {
    expect(SendMailArgsSchema.safeParse(valid).success).toBeFalse();
  });

  test.each(["", "hello", "hello@", "nullish <hello@nullish.example.com>"])(
    "rejects the recipient %p",
    (to) => {
      expect(
        SendMailArgsSchema.safeParse({ ...valid, type: MailType.VERIFY_EMAIL, to }).success,
      ).toBeFalse();
    },
  );

  test.each(["", "not a url", "/auth/verify?token=abc"])("rejects the url %p", (url) => {
    expect(
      SendMailArgsSchema.safeParse({ ...valid, type: MailType.RESET_PASSWORD, url }).success,
    ).toBeFalse();
  });

  test("rejects unknown fields", () => {
    expect(
      SendMailArgsSchema.safeParse({ ...valid, type: MailType.VERIFY_EMAIL, subject: "Hi" })
        .success,
    ).toBeFalse();
  });
});
