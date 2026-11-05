import { type Option, type Result } from "@usenullish/nullish-common";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type { DbCollectionStore, DbStore, DbStoreInitArgs } from "../../store";
import { DbRecordsById } from "../../_records/records-by-id";
import type { DbRecordsSortField } from "../../_records/records";
import type { QueryArgs } from "@usenullish/nullish-schema/db";

type SelectMemberships = Records["Core"]["Memberships"]["Select"];
type InsertMemberships = Records["Core"]["Memberships"]["Insert"];
type UpdateMemberships = Records["Core"]["Memberships"]["Update"];
type MembershipsSortField = DbRecordsSortField<Db["Core"]["Memberships"]>;

export class DbMemberships
  extends DbRecordsById<Db["Core"]["Memberships"]>
  implements
    DbStore<SelectMemberships, SelectMemberships["id"], UpdateMemberships>,
    DbCollectionStore<SelectMemberships, InsertMemberships>
{
  private constructor(args: DbStoreInitArgs) {
    super({ ...args, table: DbSchema.Core.Memberships.MembershipsSchema });
  }

  static create(args: DbStoreInitArgs): DbMemberships {
    return new this(args);
  }

  find({
    pKey: id,
  }: {
    pKey: SelectMemberships["id"];
  }): Promise<Result<Option<SelectMemberships>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Core.MembershipsSchema.SelectMembershipsSchema,
    });
  }

  list(args: QueryArgs<MembershipsSortField>): Promise<Result<SelectMemberships[]>> {
    return this._query({
      schema: RecordsSchema.Core.MembershipsSchema.SelectMembershipsSchema,
      ...args,
    });
  }

  listAll(): Promise<Result<SelectMemberships[]>> {
    return this._queryAll({
      schema: RecordsSchema.Core.MembershipsSchema.SelectMembershipsSchema,
      sort: { field: "createdAt", direction: "asc" },
    });
  }

  insert({ values }: { values: InsertMemberships }): Promise<Result<SelectMemberships>> {
    return this._insertAndReturnOne({
      values,
      returningSchema: RecordsSchema.Core.MembershipsSchema.SelectMembershipsSchema,
    });
  }

  update({
    values,
    pKey: id,
  }: {
    values: Pick<UpdateMemberships, "version"> & Partial<Omit<UpdateMemberships, "version">>;
    pKey: SelectMemberships["id"];
  }): Promise<Result<SelectMemberships>> {
    return this._updateAndReturnOneById({
      id,
      values,
      returningSchema: RecordsSchema.Core.MembershipsSchema.SelectMembershipsSchema,
    });
  }
}
