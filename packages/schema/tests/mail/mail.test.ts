import { describe, expect, test } from "bun:test";
import { DefaultTemplateLanguage } from "../../src/db/constants/documents";
import { MailType } from "../../src/mail/constants";
import { DeliverMailArgsSchema, SendMailArgsSchema } from "../../src/mail/schemas/mail";

describe("DeliverMailArgsSchema", () => {
  const valid = {
    to: "hello@nullish.example.com",
    subject: "Verify your email address",
    html: "<p>Verify your email address</p>",
    text: "Verify your email address",
  };

  test("accepts an email", () => {
    expect(DeliverMailArgsSchema.safeParse(valid).success).toBeTrue();
  });

  test.each(["", "hello", "nullish <hello@nullish.example.com>"])(
    "rejects the recipient %p",
    (to) => {
      expect(DeliverMailArgsSchema.safeParse({ ...valid, to }).success).toBeFalse();
    },
  );

  test.each(["", "   "])("rejects the subject %p", (subject) => {
    expect(DeliverMailArgsSchema.safeParse({ ...valid, subject }).success).toBeFalse();
  });

  test.each(["html", "text"] as const)("rejects an empty %s", (key) => {
    expect(DeliverMailArgsSchema.safeParse({ ...valid, [key]: "" }).success).toBeFalse();
  });

  test("rejects unknown fields", () => {
    expect(DeliverMailArgsSchema.safeParse({ ...valid, url: "https://a.b" }).success).toBeFalse();
  });
});

describe("SendMailArgsSchema", () => {
  const valid = {
    to: "hello@nullish.example.com",
    lang: DefaultTemplateLanguage.EN,
    url: "https://nullish.example.com/auth/verify?token=abc",
  };

  const invitation = {
    ...valid,
    type: MailType.INVITATION,
    organization: { name: "Acme Inc." },
    invitation: { expiresAt: new Date("2026-03-31T10:00:00Z") },
    invitedBy: { name: "Jane Doe", email: "jane@acme.test" },
  };

  test.each([MailType.VERIFY_EMAIL, MailType.RESET_PASSWORD])("accepts the type %p", (type) => {
    expect(SendMailArgsSchema.safeParse({ ...valid, type }).success).toBeTrue();
  });

  test("accepts an invitation", () => {
    expect(SendMailArgsSchema.safeParse(invitation).success).toBeTrue();
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

  test.each(["", "es", "EN"])("rejects the language %p", (lang) => {
    expect(
      SendMailArgsSchema.safeParse({ ...valid, type: MailType.VERIFY_EMAIL, lang }).success,
    ).toBeFalse();
  });

  test("rejects a missing language", () => {
    const { lang: _, ...args } = valid;

    expect(SendMailArgsSchema.safeParse({ ...args, type: MailType.VERIFY_EMAIL }).success).toBeFalse();
  });

  test("rejects unknown fields", () => {
    expect(
      SendMailArgsSchema.safeParse({ ...valid, type: MailType.VERIFY_EMAIL, subject: "Hi" })
        .success,
    ).toBeFalse();
  });

  describe("invitation", () => {
    test.each(["organization", "invitation", "invitedBy"] as const)("rejects a missing %s", (key) => {
      const { [key]: _, ...args } = invitation;

      expect(SendMailArgsSchema.safeParse(args).success).toBeFalse();
    });

    test("rejects an invitation without expiry", () => {
      expect(
        SendMailArgsSchema.safeParse({ ...invitation, invitation: {} }).success,
      ).toBeFalse();
    });

    test("rejects an inviter without email", () => {
      expect(
        SendMailArgsSchema.safeParse({ ...invitation, invitedBy: { name: "Jane Doe" } }).success,
      ).toBeFalse();
    });

    test("keeps only the fields of the email from the records", () => {
      const result = SendMailArgsSchema.parse({
        ...invitation,
        organization: { ...invitation.organization, id: crypto.randomUUID() },
        invitation: { ...invitation.invitation, role: "admin" },
        invitedBy: { ...invitation.invitedBy, emailVerified: true },
      });

      expect(result).toEqual(invitation);
    });
  });
});
