import { describe, expect, test } from "bun:test";
import { DefaultTemplateLanguage } from "@usenullish/nullish-schema/db";
import { MailType } from "@usenullish/nullish-schema/mail";
import {
  InvitationTemplateDataSchema,
  ResetPasswordTemplateDataSchema,
  VerifyEmailTemplateDataSchema,
} from "../../src/emails/schemas";
import { EMAILS_TEMPLATES } from "../../src/emails/templates";
import { renderHtmlTemplate, renderTextTemplate } from "../../src/render";

const LANGUAGES = Object.values(DefaultTemplateLanguage);

const verifyEmailData = VerifyEmailTemplateDataSchema.parse({
  nullish: {
    emailVerification: { url: "https://nullish.example.com/api/auth/verify-email?token=abc" },
  },
});

const resetPasswordData = ResetPasswordTemplateDataSchema.parse({
  nullish: {
    passwordReset: { url: "https://nullish.example.com/api/auth/reset-password/abc" },
  },
});

const invitationData = InvitationTemplateDataSchema.parse({
  nullish: {
    organization: { name: "Acme & Co" },
    invitation: {
      url: "https://nullish.example.com/invitations/accept#abc",
      expiresOn: "March 31, 2026",
      invitedBy: { name: "Jane Doe", email: "jane@acme.test" },
    },
  },
});

describe("EMAILS_TEMPLATES", () => {
  test("has a template for each mail type", () => {
    expect(Object.keys(EMAILS_TEMPLATES).sort()).toEqual(Object.values(MailType).sort());
  });

  describe.each(Object.values(MailType))("%s", (type) => {
    test("has a template for each default language", () => {
      expect(Object.keys(EMAILS_TEMPLATES[type]).sort()).toEqual([...LANGUAGES].sort());
    });

    test.each(LANGUAGES)("has a subject, an HTML and a text version in %s", (language) => {
      const { subject, html, text } = EMAILS_TEMPLATES[type][language];

      expect(subject.trim().length).toBeGreaterThan(0);
      expect(html).toContain(`lang="${language}"`);
      expect(text.length).toBeGreaterThan(0);
    });
  });

  describe.each(LANGUAGES)("%s", (language) => {
    test("renders the verification email", async () => {
      const { html, text } = EMAILS_TEMPLATES[MailType.VERIFY_EMAIL][language];
      const { url } = verifyEmailData.nullish.emailVerification;

      await expect(renderHtmlTemplate({ template: html, data: verifyEmailData })).resolves.toContain(
        url,
      );
      await expect(
        renderTextTemplate({ template: text, data: verifyEmailData }),
      ).resolves.toContain(url);
    });

    test("renders the password reset email", async () => {
      const { html, text } = EMAILS_TEMPLATES[MailType.RESET_PASSWORD][language];
      const { url } = resetPasswordData.nullish.passwordReset;

      await expect(
        renderHtmlTemplate({ template: html, data: resetPasswordData }),
      ).resolves.toContain(url);
      await expect(
        renderTextTemplate({ template: text, data: resetPasswordData }),
      ).resolves.toContain(url);
    });

    test("renders the invitation email", async () => {
      const { html, text } = EMAILS_TEMPLATES[MailType.INVITATION][language];

      const renderedHtml = await renderHtmlTemplate({ template: html, data: invitationData });
      const renderedText = await renderTextTemplate({ template: text, data: invitationData });

      for (const rendered of [renderedHtml, renderedText]) {
        expect(rendered).toContain("https://nullish.example.com/invitations/accept#abc");
        expect(rendered).toContain("March 31, 2026");
        expect(rendered).toContain("Jane Doe");
        expect(rendered).toContain("jane@acme.test");
      }

      expect(renderedHtml).toContain("Acme &amp; Co");
      expect(renderedText).toContain("Acme & Co");
    });

    test("renders the subject of the invitation with the name of the organization", async () => {
      const { subject } = EMAILS_TEMPLATES[MailType.INVITATION][language];

      await expect(
        renderTextTemplate({ template: subject, data: invitationData }),
      ).resolves.toContain("Acme & Co");
    });

    test.each([
      [MailType.VERIFY_EMAIL, verifyEmailData],
      [MailType.RESET_PASSWORD, resetPasswordData],
    ] as const)("renders the subject of %s", async (type, data) => {
      const { subject } = EMAILS_TEMPLATES[type][language];

      await expect(renderTextTemplate({ template: subject, data })).resolves.toBe(subject);
    });
  });
});
