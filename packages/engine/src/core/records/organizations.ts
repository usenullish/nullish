import { notEmptyString, type Option, type Result } from "@usenullish/nullish-common";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type { DbCollectionStore, DbStore, DbStoreInitArgs, DbListArgs } from "../../store";
import { DbRecordsById } from "../../_records/records-by-id";
import type { DbRecordsSortField } from "../../_records/records";
import { and, or } from "drizzle-orm";
import { ilikeContains } from "../../_query/helpers";

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];
type InsertOrganizations = Records["Core"]["Organizations"]["Insert"];
type UpdateOrganizations = Records["Core"]["Organizations"]["Update"];

type OrganizationsSortField = DbRecordsSortField<Db["Core"]["Organizations"]>;
type FilterOrganizations = Records["Core"]["Organizations"]["Filter"];

export class DbOrganizations
  extends DbRecordsById<Db["Core"]["Organizations"]>
  implements
    DbStore<SelectOrganizations, SelectOrganizations["id"], UpdateOrganizations>,
    DbCollectionStore<
      SelectOrganizations,
      InsertOrganizations,
      OrganizationsSortField,
      FilterOrganizations
    >
{
  private constructor(args: DbStoreInitArgs) {
    super({ ...args, table: DbSchema.Core.Organizations.OrganizationsSchema });
  }

  static create(args: DbStoreInitArgs): DbOrganizations {
    return new this(args);
  }

  find({
    pKey: id,
  }: {
    pKey: SelectOrganizations["id"];
  }): Promise<Result<Option<SelectOrganizations>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Core.OrganizationsSchema.SelectOrganizationsSchema,
    });
  }

  list({
    filters,
    ...args
  }: DbListArgs<OrganizationsSortField, FilterOrganizations>): Promise<
    Result<SelectOrganizations[]>
  > {
    return this._query({
      schema: RecordsSchema.Core.OrganizationsSchema.SelectOrganizationsSchema,
      ...args,
      filters: {
        values: filters,
        schema: RecordsSchema.Core.OrganizationsSchema.FilterOrganizationsSchema,
        where: ({ search }) =>
          and(
            notEmptyString(search)
              ? or(
                  ilikeContains({ column: this._table.name, value: search }),
                  ilikeContains({ column: this._table.email, value: search }),
                  ilikeContains({ column: this._table.city, value: search }),
                )
              : undefined,
          ),
      },
    });
  }

  insert({ values }: { values: InsertOrganizations }): Promise<Result<SelectOrganizations>> {
    // We explicitly need to use _insertAndSelect instead of _insertAndReturnOne
    // because the selection of the created row must happen after the insert has
    // fully completed, since a trigger bootstraps the related membership entry,
    // and RETURNING would check the row's visibility before that trigger's
    // effect is accounted for, causing an RLS rejection.
    return this._insertAndSelectOne({
      id: crypto.randomUUID(),
      values,
      returningSchema: RecordsSchema.Core.OrganizationsSchema.SelectOrganizationsSchema,
    });
  }

  update({
    values,
    pKey: id,
  }: {
    values: Pick<UpdateOrganizations, "version"> & Partial<Omit<UpdateOrganizations, "version">>;
    pKey: SelectOrganizations["id"];
  }): Promise<Result<SelectOrganizations>> {
    return this._updateAndReturnOneById({
      id,
      values,
      returningSchema: RecordsSchema.Core.OrganizationsSchema.SelectOrganizationsSchema,
    });
  }
}
