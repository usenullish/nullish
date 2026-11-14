import { formatDate } from "@usenullish/nullish-common";
import {
  MailSchema,
  MailType,
  type Mail as MailTypes,
  type SendMail,
} from "@usenullish/nullish-schema/mail";
import {
  EMAILS_TEMPLATES,
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
    } = EMAILS_TEMPLATES[type][lang];

    const data = this.#templateData(parsedArgs);

    const [subject, html, text] = await Promise.all([
      renderTextTemplate({ template: templateSubject, data }),
      renderHtmlTemplate({ template: templateHtml, data }),
      renderTextTemplate({ template: templateText, data }),
    ]);

    await this.deliver({ to, subject, html, text });
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
