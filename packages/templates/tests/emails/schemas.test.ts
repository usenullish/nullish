  import { describe, expect, test } from "bun:test";
import {
  InvitationTemplateDataSchema,
  ResetPasswordTemplateDataSchema,
  VerifyEmailTemplateDataSchema,
} from "../../src/emails/schemas";

describe.each([
  ["VerifyEmailTemplateDataSchema", VerifyEmailTemplateDataSchema, "emailVerification"],
  ["ResetPasswordTemplateDataSchema", ResetPasswordTemplateDataSchema, "passwordReset"],
] as const)("%s", (_name, schema, key) => {
  test("accepts a URL", () => {
    expect(
      schema.safeParse({ nullish: { [key]: { url: "https://nullish.example.com/a" } } }).success,
    ).toBeTrue();
  });

  test.each(["", "not a url"])("rejects the URL %p", (url) => {
    expect(schema.safeParse({ nullish: { [key]: { url } } }).success).toBeFalse();
  });

  test("rejects unknown fields", () => {
    expect(
      schema.safeParse({
        nullish: { [key]: { url: "https://nullish.example.com/a", token: "abc" } },
      }).success,
    ).toBeFalse();
  });
});

describe("InvitationTemplateDataSchema", () => {
  const data = {
    nullish: {
      organization: { name: "Acme Inc." },
      invitation: {
        url: "https://nullish.example.com/invitations/accept#abc",
        expiresOn: "March 31, 2026",
        invitedBy: { name: "Jane Doe", email: "jane@acme.test" },
      },
    },
  };

  test("accepts an invitation", () => {
    expect(InvitationTemplateDataSchema.safeParse(data).success).toBeTrue();
  });

  test("rejects an invitation without the name of the inviter", () => {
    expect(
      InvitationTemplateDataSchema.safeParse({
        nullish: {
          ...data.nullish,
          invitation: {
            ...data.nullish.invitation,
            invitedBy: { name: null, email: "jane@acme.test" },
          },
        },
      }).success,
    ).toBeFalse();
  });

  test("rejects an invitation without the organization", () => {
    const { organization: _, ...nullish } = data.nullish;

    expect(InvitationTemplateDataSchema.safeParse({ nullish }).success).toBeFalse();
  });

  test("rejects an invalid URL", () => {
    expect(
      InvitationTemplateDataSchema.safeParse({
        nullish: { ...data.nullish, invitation: { ...data.nullish.invitation, url: "accept" } },
      }).success,
    ).toBeFalse();
  });
});
