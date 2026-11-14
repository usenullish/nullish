import type { DefaultTemplateLanguage } from "@usenullish/nullish-schema/db";
import { MailType } from "@usenullish/nullish-schema/mail";
import invitationHtmlDe from "../../emails/invitation/html/de.html" with { type: "text" };
import invitationHtmlEn from "../../emails/invitation/html/en.html" with { type: "text" };
import invitationHtmlFr from "../../emails/invitation/html/fr.html" with { type: "text" };
import invitationHtmlIt from "../../emails/invitation/html/it.html" with { type: "text" };
import invitationTextDe from "../../emails/invitation/text/de.txt" with { type: "text" };
import invitationTextEn from "../../emails/invitation/text/en.txt" with { type: "text" };
import invitationTextFr from "../../emails/invitation/text/fr.txt" with { type: "text" };
import invitationTextIt from "../../emails/invitation/text/it.txt" with { type: "text" };
import resetPasswordHtmlDe from "../../emails/reset-password/html/de.html" with { type: "text" };
import resetPasswordHtmlEn from "../../emails/reset-password/html/en.html" with { type: "text" };
import resetPasswordHtmlFr from "../../emails/reset-password/html/fr.html" with { type: "text" };
import resetPasswordHtmlIt from "../../emails/reset-password/html/it.html" with { type: "text" };
import resetPasswordTextDe from "../../emails/reset-password/text/de.txt" with { type: "text" };
import resetPasswordTextEn from "../../emails/reset-password/text/en.txt" with { type: "text" };
import resetPasswordTextFr from "../../emails/reset-password/text/fr.txt" with { type: "text" };
import resetPasswordTextIt from "../../emails/reset-password/text/it.txt" with { type: "text" };
import verifyEmailHtmlDe from "../../emails/verify-email/html/de.html" with { type: "text" };
import verifyEmailHtmlEn from "../../emails/verify-email/html/en.html" with { type: "text" };
import verifyEmailHtmlFr from "../../emails/verify-email/html/fr.html" with { type: "text" };
import verifyEmailHtmlIt from "../../emails/verify-email/html/it.html" with { type: "text" };
import verifyEmailTextDe from "../../emails/verify-email/text/de.txt" with { type: "text" };
import verifyEmailTextEn from "../../emails/verify-email/text/en.txt" with { type: "text" };
import verifyEmailTextFr from "../../emails/verify-email/text/fr.txt" with { type: "text" };
import verifyEmailTextIt from "../../emails/verify-email/text/it.txt" with { type: "text" };
import invitationSubject from "../../emails/invitation/subject.json";
import resetPasswordSubject from "../../emails/reset-password/subject.json";
import verifyEmailSubject from "../../emails/verify-email/subject.json";

interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export const EMAILS_TEMPLATES = {
  [MailType.VERIFY_EMAIL]: {
    de: { subject: verifyEmailSubject.de, html: verifyEmailHtmlDe, text: verifyEmailTextDe },
    en: { subject: verifyEmailSubject.en, html: verifyEmailHtmlEn, text: verifyEmailTextEn },
    fr: { subject: verifyEmailSubject.fr, html: verifyEmailHtmlFr, text: verifyEmailTextFr },
    it: { subject: verifyEmailSubject.it, html: verifyEmailHtmlIt, text: verifyEmailTextIt },
  },
  [MailType.RESET_PASSWORD]: {
    de: { subject: resetPasswordSubject.de, html: resetPasswordHtmlDe, text: resetPasswordTextDe },
    en: { subject: resetPasswordSubject.en, html: resetPasswordHtmlEn, text: resetPasswordTextEn },
    fr: { subject: resetPasswordSubject.fr, html: resetPasswordHtmlFr, text: resetPasswordTextFr },
    it: { subject: resetPasswordSubject.it, html: resetPasswordHtmlIt, text: resetPasswordTextIt },
  },
  [MailType.INVITATION]: {
    de: { subject: invitationSubject.de, html: invitationHtmlDe, text: invitationTextDe },
    en: { subject: invitationSubject.en, html: invitationHtmlEn, text: invitationTextEn },
    fr: { subject: invitationSubject.fr, html: invitationHtmlFr, text: invitationTextFr },
    it: { subject: invitationSubject.it, html: invitationHtmlIt, text: invitationTextIt },
  },
} as unknown as Record<MailType, Record<DefaultTemplateLanguage, EmailTemplate>>;
