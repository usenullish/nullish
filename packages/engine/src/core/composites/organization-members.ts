import { and, eq } from "drizzle-orm";
import { DbUserContext, selectMany } from "@usenullish/nullish-db";
import { assertArrayAtMostOne, type Option, type Result, tryCatch } from "@usenullish/nullish-common";
import { DbView } from "@usenullish/nullish-schema/db";
import { type Views, ViewsSchema } from "@usenullish/nullish-schema/views";
import type { DbStoreInitArgs } from "../../store";

type OrganizationMember = Views["Core"]["OrganizationMembers"]["Select"];

const view = DbView.Core.OrganizationMembers.OrganizationMembersView;

export class DbOrganizationMembers extends DbUserContext {
  private constructor(args: DbStoreInitArgs) {
    super(args);
  }

  static create(args: DbStoreInitArgs): DbOrganizationMembers {
    return new this(args);
  }

  find({
    organizationId,
    userId,
  }: Pick<OrganizationMember, "organizationId" | "userId">): Promise<
    Result<Option<OrganizationMember>>
  > {
    return tryCatch(async () => {
      return await this._withAuth<Option<OrganizationMember>>(async (tx) => {
        const members = await selectMany({
          tx,
          table: view,
          schema: ViewsSchema.Core.OrganizationMembersView.SelectOrganizationMembersView,
          where: and(eq(view.organizationId, organizationId), eq(view.userId, userId)),
        });

        assertArrayAtMostOne(members);

        const [member] = members;
        return member;
      });
    });
  }
}
