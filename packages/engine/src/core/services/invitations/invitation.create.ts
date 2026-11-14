import { CryptoHasher as BunCryptoHasher } from "bun";
import { type DbUserContextArgs } from "@usenullish/nullish-db";
import {
  assertNonNullish,
  isNullish,
  type Nullable,
  type Option,
  type Result,
  tryCatch,
} from "@usenullish/nullish-common";
import { envAppUrl } from "@usenullish/nullish-env";
import { DbSchema, DefaultTemplateLanguage } from "@usenullish/nullish-schema/db";
import { type Mail, MailType, type SendMail } from "@usenullish/nullish-schema/mail";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { INVITATION_ACCEPT_PATH, InvitationMailStatus } from "@usenullish/nullish-schema/server";
import { ServiceContext } from "../../../_service/service";
import { getOrganization } from "../../_helpers/organizations";
import { getOrganizationMember } from "../../_helpers/organization-members";

type Invitation = Records["Core"]["Invitations"]["Select"];
type InsertInvitation = Records["Core"]["Invitations"]["Insert"];
type Organization = Records["Core"]["Organizations"]["Select"];
type UserId = Records["Auth"]["Users"]["Select"]["id"];
type SendInvitationArgs = Extract<Mail["Send"]["Args"], { type: MailType.INVITATION }>;

export type CreateInvitationServiceArgs = DbUserContextArgs & {
  organizationId: Organization["id"];
  mail: Nullable<SendMail>;
};

export class CreateInvitationService extends ServiceContext {
  readonly #userId: UserId;
  readonly #organizationId: Organization["id"];
  readonly #mail: Nullable<SendMail>;

  private constructor({ organizationId, mail, userId, ...rest }: CreateInvitationServiceArgs) {
    super({ userId, ...rest });

    this.#userId = userId;
    this.#organizationId = organizationId;
    this.#mail = mail;
  }

  static create(args: CreateInvitationServiceArgs): CreateInvitationService {
    return new this(args);
  }

  create({
    invitation,
    language,
  }: {
    invitation: InsertInvitation;
    language?: Option<SendInvitationArgs["lang"]>;
  }): Promise<
    Result<{
      invitation: Invitation;
      token: string;
      link: string;
      mail: Nullable<InvitationMailStatus>;
    }>
  > {
    return tryCatch(async () => {
      const { token, link } = this.#prepare();

      const { invitation: insertedInvitation } = await this.#insertInvitation({
        invitation,
        token,
      });

      const mail = isNullish(this.#mail)
        ? null
        : await this.#send({
            invitation: insertedInvitation,
            link,
            language,
            mail: this.#mail,
          });

      return { invitation: insertedInvitation, token, link, mail };
    });
  }

  #prepare(): { token: string; link: URL["href"] } {
    const token = crypto.getRandomValues(new Uint8Array(32)).toBase64({
      alphabet: "base64url",
      omitPadding: true,
    });

    return {
      token,
      link: `${envAppUrl()}${INVITATION_ACCEPT_PATH}#${token}`,
    };
  }

  async #insertInvitation({
    invitation,
    token,
  }: {
    invitation: InsertInvitation;
    token: string;
  }): Promise<{ invitation: Invitation }> {
    return await this._withAuth(async (tx) => {
      const tokenHash = new BunCryptoHasher("sha256").update(token).digest("hex");

      const [row] = await tx
        .insert(DbSchema.Core.Invitations.InvitationsSchema)
        .values({
          ...invitation,
          organizationId: this.#organizationId,
          tokenHash,
        })
        .returning();

      assertNonNullish(row);

      return {
        invitation: RecordsSchema.Core.InvitationsSchema.SelectInvitationsSchema.parse(row),
      };
    });
  }

  async #send({
    invitation: { email: to, expiresAt },
    link,
    language,
    mail,
  }: {
    invitation: Invitation;
    link: URL["href"];
    language: Option<SendInvitationArgs["lang"]>;
    mail: SendMail;
  }): Promise<InvitationMailStatus> {
    const result = await tryCatch(async () => {
      const data = await this.#prepareMailData();

      await mail.send({
        type: MailType.INVITATION,
        to,
        lang: language ?? DefaultTemplateLanguage.EN,
        url: link,
        invitation: { expiresAt },
        ...data,
      });
    });

    if (result.status === "error") {
      console.error("Unexpected error while sending an invitation email", result.err);
      return InvitationMailStatus.FAILED;
    }

    return InvitationMailStatus.SENT;
  }

  async #prepareMailData(): Promise<Pick<SendInvitationArgs, "organization" | "invitedBy">> {
    return await this._withAuth(async (tx) => {
      const organization = await getOrganization({
        tx,
        id: this.#organizationId,
      });

      const invitedBy = await getOrganizationMember({
        tx,
        organizationId: this.#organizationId,
        userId: this.#userId,
      });

      return { organization, invitedBy };
    });
  }
}
