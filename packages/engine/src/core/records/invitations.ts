import { type Option, type Result } from "@usenullish/nullish-common";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type {
  DbCollectionStoreInitArgs,
  DbDeletableStore,
  DbListArgs,
  DbStoreInitArgs,
} from "../../store";
import { DbCollectionRecordsById } from "../../_records/collection-records-by-id";
import { DbRecordsById } from "../../_records/records-by-id";
import type { DbRecordsSortField } from "../../_records/records";

type SelectInvitations = Records["Core"]["Invitations"]["Select"];
type InvitationsSortField = DbRecordsSortField<Db["Core"]["Invitations"]>;

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbInvitations
  extends DbRecordsById<Db["Core"]["Invitations"]>
  implements DbDeletableStore<SelectInvitations, SelectInvitations["id"]>
{
  private constructor(args: DbStoreInitArgs) {
    super({ ...args, table: DbSchema.Core.Invitations.InvitationsSchema });
  }

  static create(args: DbStoreInitArgs): DbInvitations {
    return new this(args);
  }

  find({
    pKey: id,
  }: {
    pKey: SelectInvitations["id"];
  }): Promise<Result<Option<SelectInvitations>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Core.InvitationsSchema.SelectInvitationsSchema,
    });
  }

  delete({
    pKey: id,
  }: {
    pKey: SelectInvitations["id"];
  }): Promise<Result<Option<SelectInvitations>>> {
    return this._deleteAndReturnOneById({
      id,
      returningSchema: RecordsSchema.Core.InvitationsSchema.SelectInvitationsSchema,
    });
  }
}

export class DbCollectionInvitations extends DbCollectionRecordsById<
  Db["Core"]["Invitations"],
  SelectOrganizations["id"]
> {
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Core.Invitations.InvitationsSchema,
      foreignKeyColumn: DbSchema.Core.Invitations.InvitationsSchema.organizationId,
    });
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionInvitations {
    return new this(args);
  }

  list(args: DbListArgs<InvitationsSortField>): Promise<Result<SelectInvitations[]>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Core.InvitationsSchema.SelectInvitationsSchema,
      ...args,
    });
  }
}
