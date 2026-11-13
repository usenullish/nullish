import { CryptoHasher as BunCryptoHasher } from "bun";
import { type DbUserContextArgs } from "@usenullish/nullish-db";
import {
  assertNonNullish,
  isNullish,
  type Nullable,
  type Result,
  tryCatch,
} from "@usenullish/nullish-common";
import { envAppUrl } from "@usenullish/nullish-env";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { MailType, type SendMail } from "@usenullish/nullish-schema/mail";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { INVITATION_ACCEPT_PATH, InvitationMailStatus } from "@usenullish/nullish-schema/server";
import { ServiceContext } from "../../../_service/service";

type Invitation = Records["Core"]["Invitations"]["Select"];
type InsertInvitation = Records["Core"]["Invitations"]["Insert"];
type Organization = Records["Core"]["Organizations"]["Select"];

export type CreateInvitationServiceArgs = DbUserContextArgs & {
  organizationId: Organization["id"];
  values: InsertInvitation;
  mail: Nullable<SendMail>;
};

export class CreateInvitationService extends ServiceContext {
  readonly #organizationId: Organization["id"];
  readonly #values: InsertInvitation;
  readonly #mail: Nullable<SendMail>;

  private constructor({ organizationId, values, mail, ...rest }: CreateInvitationServiceArgs) {
    super(rest);

    this.#organizationId = organizationId;
    this.#values = values;
    this.#mail = mail;
  }

  static create(args: CreateInvitationServiceArgs): CreateInvitationService {
    return new this(args);
  }

  create(): Promise<
    Result<{
      invitation: Invitation;
      token: string;
      link: string;
      mail: Nullable<InvitationMailStatus>;
    }>
  > {
    return tryCatch(async () => {
      const { token, link } = this.#prepare();

      const { invitation } = await this.#insertInvitation({ token });

      const mail = isNullish(this.#mail)
        ? null
        : await this.#send({ to: invitation.email, link, mail: this.#mail });

      return { invitation, token, link, mail };
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

  async #insertInvitation({ token }: { token: string }): Promise<{ invitation: Invitation }> {
    return await this._withAuth(async (tx) => {
      const tokenHash = new BunCryptoHasher("sha256").update(token).digest("hex");

      const [row] = await tx
        .insert(DbSchema.Core.Invitations.InvitationsSchema)
        .values({
          ...this.#values,
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
    to,
    link,
    mail,
  }: {
    to: Invitation["email"];
    link: string;
    mail: SendMail;
  }): Promise<InvitationMailStatus> {
    const result = await tryCatch(async () => {
      await mail.send({ type: MailType.INVITATION, to, url: link });
    });

    if (result.status === "error") {
      console.error("Unexpected error while sending an invitation email", result.err);
      return InvitationMailStatus.FAILED;
    }

    return InvitationMailStatus.SENT;
  }
}
