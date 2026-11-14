import { join } from "node:path";
import { formatDate, isNullish, type Option } from "@usenullish/nullish-common";
import { envMailTemplatesDir } from "@usenullish/nullish-env";
import type { DefaultTemplateLanguage } from "@usenullish/nullish-schema/db";
import {
  MailSchema,
  MailType,
  type Mail as MailTypes,
  type SendMail,
} from "@usenullish/nullish-schema/mail";
import {
  EMAILS_TEMPLATES,
  EmailSubjectsSchema,
  EmailTemplateSchema,
  type InvitationTemplateData,
  type ResetPasswordTemplateData,
  type VerifyEmailTemplateData,
  renderHtmlTemplate,
  renderTextTemplate,
} from "@usenullish/nullish-templates";

export abstract class MailProvider implements SendMail {
  protected constructor() {}

  async send(args: MailTypes["Send"]["Args"]): Promise<void> {
    const parsedArgs = MailSchema.SendMailArgsSchema.parse(args);
    const { type, to, lang } = parsedArgs;

    const {
      subject: templateSubject,
      html: templateHtml,
      text: templateText,
    } = (await this.#customTemplate({ type, lang })) ?? EMAILS_TEMPLATES[type][lang];

    const data = this.#templateData(parsedArgs);

    const [subject, html, text] = await Promise.all([
      renderTextTemplate({ template: templateSubject, data }),
      renderHtmlTemplate({ template: templateHtml, data }),
      renderTextTemplate({ template: templateText, data }),
    ]);

    await this.deliver({ to, subject, html, text });
  }

  async #customTemplate({
    type,
    lang,
  }: Pick<MailTypes["Send"]["Args"], "type" | "lang">): Promise<
    Option<(typeof EMAILS_TEMPLATES)[MailType][DefaultTemplateLanguage]>
  > {
    const dir = envMailTemplatesDir();

    if (isNullish(dir)) {
      return undefined;
    }

    const folder = join(dir, type);

    const subjectFile = Bun.file(join(folder, "subject.json"));
    const htmlFile = Bun.file(join(folder, "html", `${lang}.html`));
    const textFile = Bun.file(join(folder, "text", `${lang}.txt`));

    const exist = await Promise.all([subjectFile.exists(), htmlFile.exists(), textFile.exists()]);

    if (exist.includes(false)) {
      return undefined;
    }

    const [subjects, html, text] = await Promise.all([
      subjectFile.json(),
      htmlFile.text(),
      textFile.text(),
    ]);

    const subject = EmailSubjectsSchema.parse(subjects)[lang];

    return isNullish(subject) ? undefined : EmailTemplateSchema.parse({ subject, html, text });
  }

  #templateData(
    args: MailTypes["Send"]["Args"],
  ): VerifyEmailTemplateData | ResetPasswordTemplateData | InvitationTemplateData {
    switch (args.type) {
      case MailType.VERIFY_EMAIL:
        return { nullish: { emailVerification: { url: args.url } } };
      case MailType.RESET_PASSWORD:
        return { nullish: { passwordReset: { url: args.url } } };
      case MailType.INVITATION: {
        const { lang, url, organization, invitation, invitedBy } = args;

        return {
          nullish: {
            organization,
            invitation: {
              url,
              expiresOn: formatDate({ locale: lang, date: invitation.expiresAt }),
              invitedBy,
            },
          },
        };
      }
    }
  }

  protected abstract deliver(args: MailTypes["Deliver"]["Args"]): Promise<void>;
}
