import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DefaultTemplateLanguage } from "@usenullish/nullish-schema/db";
import { assertNonNullish } from "@usenullish/nullish-common";
import { type Mail as MailTypes, MailType } from "@usenullish/nullish-schema/mail";

const sendMail = mock(async (_mail: MailTypes["Deliver"]["Args"]) => ({}));

mock.module("nodemailer", () => ({ createTransport: mock(() => ({ sendMail })) }));

const { SmtpMailProvider } = await import("../src/_smtp");

describe("MailProvider", () => {
  const KEYS = ["NULLISH_MAIL_FROM", "NULLISH_MAIL_SMTP_URL", "NULLISH_MAIL_TEMPLATES_DIR"] as const;

  const saved = new Map<string, string | undefined>();

  const to = "user@nullish.example.com";

  const invitation = {
    type: MailType.INVITATION,
    to,
    url: "https://nullish.example.com/invitations/accept#abc",
    organization: { name: "Acme & Co" },
    invitation: { expiresAt: new Date("2026-03-31T10:00:00Z") },
    invitedBy: { name: "Jane Doe", email: "jane@acme.test" },
  } as const;

  const delivered = (): MailTypes["Deliver"]["Args"] => {
    const mail = sendMail.mock.calls[0]?.[0];

    assertNonNullish(mail);

    return mail;
  };

  beforeEach(() => {
    for (const key of KEYS) {
      saved.set(key, process.env[key]);
      delete process.env[key];
    }

    process.env.NULLISH_MAIL_FROM = "hello@nullish.example.com";
    process.env.NULLISH_MAIL_SMTP_URL = "smtp://localhost:1025";

    sendMail.mockClear();
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

  describe.each(Object.values(DefaultTemplateLanguage))("%s", (lang) => {
    test.each([MailType.VERIFY_EMAIL, MailType.RESET_PASSWORD] as const)(
      "renders %s with its URL",
      async (type) => {
        const url = "https://nullish.example.com/api/auth/abc";

        await SmtpMailProvider.create().send({ type, to, lang, url });

        const mail = delivered();

        expect(mail.to).toBe(to);
        expect(mail.subject.length).toBeGreaterThan(0);
        expect(mail.html).toContain(url);
        expect(mail.text).toContain(url);
      },
    );

    test("renders the invitation with its data", async () => {
      await SmtpMailProvider.create().send({ ...invitation, lang });

      const mail = delivered();

      expect(mail.subject).toContain("Acme & Co");
      expect(mail.html).toContain("Acme &amp; Co");
      expect(mail.text).toContain("Acme & Co");

      for (const body of [mail.html, mail.text]) {
        expect(body).toContain(invitation.url);
        expect(body).toContain("Jane Doe");
        expect(body).toContain("jane@acme.test");
        expect(body).toContain("2026");
      }
    });
  });

  test("renders in the language of the email", async () => {
    await SmtpMailProvider.create().send({
      type: MailType.VERIFY_EMAIL,
      to,
      lang: DefaultTemplateLanguage.FR,
      url: "https://nullish.example.com/a",
    });

    expect(delivered().subject).toBe("Confirme ton adresse e-mail");
  });

  test("formats the expiry date in the language of the email", async () => {
    await SmtpMailProvider.create().send({ ...invitation, lang: DefaultTemplateLanguage.DE });

    expect(delivered().text).toContain("31.03.2026");
  });

  test("rejects an unknown language without delivering", async () => {
    await expect(
      SmtpMailProvider.create().send({
        type: MailType.VERIFY_EMAIL,
        to,
        lang: "es" as DefaultTemplateLanguage,
        url: "https://nullish.example.com/a",
      }),
    ).rejects.toThrow();

    expect(sendMail).not.toHaveBeenCalled();
  });

  describe("templates folder", () => {
    const args = {
      type: MailType.INVITATION,
      to,
      lang: DefaultTemplateLanguage.FR,
      url: "https://nullish.example.com/invitations/accept#abc",
      organization: { name: "Acme" },
      invitation: { expiresAt: new Date("2026-03-31T10:00:00Z") },
      invitedBy: { name: "Jane Doe", email: "jane@acme.test" },
    } as const;

    let dir: string;

    beforeEach(async () => {
      dir = await mkdtemp(join(tmpdir(), "nullish-mail-templates-"));

      await mkdir(join(dir, MailType.INVITATION, "html"), { recursive: true });
      await mkdir(join(dir, MailType.INVITATION, "text"), { recursive: true });

      await writeFile(
        join(dir, MailType.INVITATION, "subject.json"),
        JSON.stringify({ fr: "Rejoins [[ nullish.organization.name ]]" }),
      );
      await writeFile(
        join(dir, MailType.INVITATION, "html", "fr.html"),
        "<p>[[ nullish.invitation.invitedBy.name ]] [[ nullish.invitation.url ]]</p>",
      );
      await writeFile(
        join(dir, MailType.INVITATION, "text", "fr.txt"),
        "[[ nullish.invitation.invitedBy.name ]] [[ nullish.invitation.url ]]",
      );

      process.env.NULLISH_MAIL_TEMPLATES_DIR = dir;
    });

    afterEach(async () => {
      await rm(dir, { recursive: true, force: true });
    });

    test("uses the subject, the HTML and the text of the folder", async () => {
      await SmtpMailProvider.create().send(args);

      const { subject, html, text } = delivered();

      expect(subject).toBe("Rejoins Acme");
      expect(html).toBe(`<p>Jane Doe ${args.url}</p>`);
      expect(text).toBe(`Jane Doe ${args.url}`);
    });

    describe("invalid", () => {
      let consoleError: ReturnType<typeof spyOn>;

      beforeEach(() => {
        consoleError = spyOn(console, "error").mockImplementation(() => {});
      });

      afterEach(() => {
        consoleError.mockRestore();
      });

      test.each([
        ["an empty HTML", "html/fr.html", ""],
        ["an empty text", "text/fr.txt", "   "],
        ["a subject.json that is not JSON", "subject.json", "{"],
        ["an empty subject", "subject.json", JSON.stringify({ fr: "" })],
        ["a subject that is not text", "subject.json", JSON.stringify({ fr: 42 })],
      ])("uses the built-in template and logs for %s", async (_name, file, content) => {
        await writeFile(join(dir, MailType.INVITATION, file), content);

        await SmtpMailProvider.create().send(args);

        expect(delivered().subject).not.toBe("Rejoins Acme");
        expect(consoleError).toHaveBeenCalledTimes(1);
      });
    });

    test("uses the built-in template when a file of the folder is missing", async () => {
      await rm(join(dir, MailType.INVITATION, "text", "fr.txt"));

      await SmtpMailProvider.create().send(args);

      const { subject, html } = delivered();

      expect(subject).not.toBe("Rejoins Acme");
      expect(html).toContain('lang="fr"');
    });

    test("uses the built-in template of a language the folder has no subject for", async () => {
      await writeFile(join(dir, MailType.INVITATION, "html", "en.html"), "<p>custom</p>");
      await writeFile(join(dir, MailType.INVITATION, "text", "en.txt"), "custom");

      await SmtpMailProvider.create().send({ ...args, lang: DefaultTemplateLanguage.EN });

      const { subject, html } = delivered();

      expect(subject).toContain("Acme");
      expect(html).toContain('lang="en"');
    });

    test("uses the built-in templates of an email the folder has none for", async () => {
      await SmtpMailProvider.create().send({
        type: MailType.VERIFY_EMAIL,
        to,
        lang: DefaultTemplateLanguage.FR,
        url: "https://nullish.example.com/a",
      });

      expect(delivered().subject).toBe("Confirme ton adresse e-mail");
    });
  });
});
