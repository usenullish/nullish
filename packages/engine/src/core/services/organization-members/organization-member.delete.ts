import { type DbUserContextArgs } from "@usenullish/nullish-db";
import { sql } from "drizzle-orm";
import {
  assertArrayAtMostOne,
  isNullish,
  type Option,
  type Result,
  tryCatch,
} from "@usenullish/nullish-common";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { ServiceContext } from "../../../_service/service";

type Membership = Records["Core"]["Memberships"]["Select"];

export type DeleteOrganizationMemberServiceArgs = DbUserContextArgs & {
  membershipId: Membership["id"];
};

const DeletedMembershipsSchema = RecordsSchema.Core.MembershipsSchema.SelectMembershipsSchema.pick({
  id: true,
});

export class DeleteOrganizationMemberService extends ServiceContext {
  readonly #membershipId: Membership["id"];

  private constructor({ membershipId, ...rest }: DeleteOrganizationMemberServiceArgs) {
    super(rest);

    this.#membershipId = membershipId;
  }

  static create(args: DeleteOrganizationMemberServiceArgs): DeleteOrganizationMemberService {
    return new this(args);
  }

  /**
   * Removes the membership (an admin removing a member, or a member leaving) together with the
   * person's conversations in that organization. Resolves to the removed membership (its id), or
   * to undefined when there is none or the user may not remove it.
   */
  delete(): Promise<Result<Option<Pick<Membership, "id">>>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const rows = await tx.execute(
          sql`SELECT id FROM core.delete_organization_member(${this.#membershipId})`,
        );

        assertArrayAtMostOne(rows);

        const [row] = rows;
        return isNullish(row) ? undefined : DeletedMembershipsSchema.parse(row);
      });
    });
  }
}
