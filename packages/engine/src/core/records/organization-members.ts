import { and, eq, getColumns } from "drizzle-orm";
import { DbUserContext, selectMany } from "@usenullish/nullish-db";
import { type Option, type Result, tryCatch } from "@usenullish/nullish-common";
import { DbView, queryArgsSchema } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { type Views, ViewsSchema } from "@usenullish/nullish-schema/views";
import type { DbCollectionStoreInitArgs, DbListArgs } from "../../store";
import { parseQueryArgs } from "../../_query/helpers";

type OrganizationMember = Views["Core"]["OrganizationMembers"]["Select"];

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

const view = DbView.Core.OrganizationMembers.OrganizationMembersView;

export class DbCollectionOrganizationMembers extends DbUserContext {
  readonly #organizationId: SelectOrganizations["id"];
  readonly #queryArgsSchema = queryArgsSchema(
    Object.keys(getColumns(view)) as [string, ...string[]],
  );

  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super(args);

    this.#organizationId = args.foreignKeyId;
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionOrganizationMembers {
    return new this(args);
  }

  find({
    userId,
  }: {
    userId: OrganizationMember["userId"];
  }): Promise<Result<Option<OrganizationMember>>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const [member] = await selectMany({
          tx,
          table: view,
          schema: ViewsSchema.Core.OrganizationMembersView.SelectOrganizationMembersView,
          where: and(eq(view.organizationId, this.#organizationId), eq(view.userId, userId)),
        });

        return member;
      });
    });
  }

  list({ pagination, sort }: DbListArgs<string>): Promise<Result<OrganizationMember[]>> {
    return tryCatch(async () => {
      const queryArgs = parseQueryArgs({
        args: { pagination, sort },
        schema: this.#queryArgsSchema,
        table: view,
        pKey: view.id,
      });

      return await this._withAuth(async (tx) => {
        return await selectMany({
          tx,
          table: view,
          schema: ViewsSchema.Core.OrganizationMembersView.SelectOrganizationMembersView,
          where: eq(view.organizationId, this.#organizationId),
          ...queryArgs,
        });
      });
    });
  }
}
