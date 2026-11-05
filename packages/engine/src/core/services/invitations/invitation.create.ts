import { CryptoHasher as BunCryptoHasher } from "bun";
import { type DbUserContextArgs } from "@usenullish/nullish-db";
import { assertNonNullish, type Result, tryCatch } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { ServiceContext } from "../../../_service/service";

type Invitation = Records["Core"]["Invitations"]["Select"];
type InsertInvitation = Records["Core"]["Invitations"]["Insert"];
type Organization = Records["Core"]["Organizations"]["Select"];

export type CreateInvitationServiceArgs = DbUserContextArgs & {
  organizationId: Organization["id"];
  values: InsertInvitation;
};

export class CreateInvitationService extends ServiceContext {
  readonly #organizationId: Organization["id"];
  readonly #values: InsertInvitation;

  private constructor({ organizationId, values, ...rest }: CreateInvitationServiceArgs) {
    super(rest);

    this.#organizationId = organizationId;
    this.#values = values;
  }

  static create(args: CreateInvitationServiceArgs): CreateInvitationService {
    return new this(args);
  }

  create(): Promise<Result<{ invitation: Invitation; token: string }>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const token = crypto.getRandomValues(new Uint8Array(32)).toBase64({
          alphabet: "base64url",
          omitPadding: true,
        });

        const tokenHash = new BunCryptoHasher("sha256").update(token).digest("hex");

        const [row] = await tx
          .insert(DbSchema.Core.Invitations.InvitationsSchema)
          .values({ ...this.#values, organizationId: this.#organizationId, tokenHash })
          .returning();

        assertNonNullish(row);

        return {
          invitation: RecordsSchema.Core.InvitationsSchema.SelectInvitationsSchema.parse(row),
          token,
        };
      });
    });
  }
}
