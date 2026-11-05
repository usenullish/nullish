import { sql } from "drizzle-orm";
import { assertArrayExactlyOne, type Result, tryCatch } from "@usenullish/nullish-common";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { InvitationService, type InvitationServiceArgs } from "./_invitation";

type Membership = Records["Core"]["Memberships"]["Select"];

const AcceptedMembershipSchema = RecordsSchema.Core.MembershipsSchema.SelectMembershipsSchema.pick({
  id: true,
  organizationId: true,
  role: true,
});

export class AcceptInvitationService extends InvitationService {
  private constructor(args: InvitationServiceArgs) {
    super(args);
  }

  static create(args: InvitationServiceArgs): AcceptInvitationService {
    return new this(args);
  }

  accept(): Promise<Result<Pick<Membership, "id" | "organizationId" | "role">>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const rows = await tx.execute(
          sql`SELECT id, organization_id AS "organizationId", role FROM core.accept_invitation(${this._token})`,
        );

        assertArrayExactlyOne(rows);

        const [row] = rows;

        return AcceptedMembershipSchema.parse(row);
      });
    });
  }
}
