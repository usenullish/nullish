import { CryptoHasher } from "bun";
import { and, eq, gt, sql } from "drizzle-orm";
import { isNullish, nonNullish, type Result } from "@usenullish/nullish-common";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { AdminServiceContext, type AdminServiceContextArgs } from "../../_service";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type { Api } from "@usenullish/nullish-schema/server";

const users = DbSchema.Auth.Auth.users;
const invitations = DbSchema.Core.Invitations.InvitationsSchema;

type Invitation = Records["Core"]["Invitations"]["Select"];
type InvitationToken = Api["InvitationsCreate"]["Client"]["CreateInvitationResponse"]["token"];

export class SignUpService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): SignUpService {
    return new this(args);
  }

  hasUsers(): Promise<Result<boolean>> {
    return this._withDbContext(async (tx) => {
      const count = await tx.$count(users);
      return count > 0;
    });
  }

  isInvitationValid({
    token,
    email,
  }: {
    token: InvitationToken;
    email: Invitation["email"];
  }): Promise<Result<boolean>> {
    return this._withDbContext(async (tx) => {
      const [row] = await tx
        .select()
        .from(invitations)
        .where(
          and(
            eq(invitations.tokenHash, new CryptoHasher("sha256").update(token).digest("hex")),
            eq(sql`lower(${invitations.email})`, email.toLowerCase()),
            gt(invitations.expiresAt, sql`now()`),
          ),
        )
        .limit(1);

      if (isNullish(row)) {
        return false;
      }

      const invitation = RecordsSchema.Core.InvitationsSchema.SelectInvitationsSchema.parse(row);
      return nonNullish(invitation);
    });
  }
}
