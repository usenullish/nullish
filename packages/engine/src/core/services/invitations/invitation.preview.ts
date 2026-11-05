import { sql } from "drizzle-orm";
import * as z from "zod";
import { assertArrayExactlyOne, type Result, tryCatch } from "@usenullish/nullish-common";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { InvitationService, type InvitationServiceArgs } from "./_invitation";

type Organization = Records["Core"]["Organizations"]["Select"];

const InvitationPreviewSchema = z.strictObject({
  organizationName: RecordsSchema.Core.OrganizationsSchema.SelectOrganizationsSchema.shape.name,
});

export class PreviewInvitationService extends InvitationService {
  private constructor(args: InvitationServiceArgs) {
    super(args);
  }

  static create(args: InvitationServiceArgs): PreviewInvitationService {
    return new this(args);
  }

  preview(): Promise<Result<{ organizationName: Organization["name"] }>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const rows = await tx.execute(
          sql`SELECT organization_name AS "organizationName" FROM core.get_invitation(${this._token})`,
        );

        assertArrayExactlyOne(rows);

        const [row] = rows;

        return InvitationPreviewSchema.parse(row);
      });
    });
  }
}
