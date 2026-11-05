import { nonNullish, notEmptyString, type Option, type Result } from "@usenullish/nullish-common";
import { type Db, DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type {
  DbCollectionStore,
  DbCollectionStoreInitArgs,
  DbDeletableStore,
  DbListArgs,
  DbStore,
  DbStoreInitArgs,
} from "../../store";
import { DbCollectionRecordsById } from "../../_records/collection-records-by-id";
import { DbRecordsById } from "../../_records/records-by-id";
import type { DbRecordsSortField } from "../../_records/records";
import { and, eq, or } from "drizzle-orm";
import { ilikeContains } from "../../_query/helpers";

type SelectClients = Records["Billing"]["Clients"]["Select"];
type InsertClients = Records["Billing"]["Clients"]["Insert"];
type UpdateClients = Records["Billing"]["Clients"]["Update"];

type ClientsSortField = DbRecordsSortField<Db["Billing"]["Clients"]>;
type FilterClients = Records["Billing"]["Clients"]["Filter"];

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbClients
  extends DbRecordsById<Db["Billing"]["Clients"]>
  implements
    DbStore<SelectClients, SelectClients["id"], UpdateClients>,
    DbDeletableStore<SelectClients, SelectClients["id"]>
{
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Billing.Clients.ClientsSchema,
    });
  }

  static create(args: DbStoreInitArgs): DbClients {
    return new this(args);
  }

  find({ pKey: id }: { pKey: SelectClients["id"] }): Promise<Result<Option<SelectClients>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Billing.ClientsSchema.SelectClientsSchema,
    });
  }

  delete({ pKey: id }: { pKey: SelectClients["id"] }): Promise<Result<Option<SelectClients>>> {
    return this._deleteAndReturnOneById({
      id,
      returningSchema: RecordsSchema.Billing.ClientsSchema.SelectClientsSchema,
    });
  }

  update({
    values,
    pKey: id,
  }: {
    values: Pick<UpdateClients, "version"> & Partial<Omit<UpdateClients, "version">>;
    pKey: SelectClients["id"];
  }): Promise<Result<SelectClients>> {
    return this._updateAndReturnOneById({
      id,
      values,
      returningSchema: RecordsSchema.Billing.ClientsSchema.SelectClientsSchema,
    });
  }
}

export class DbCollectionClients
  extends DbCollectionRecordsById<Db["Billing"]["Clients"], SelectOrganizations["id"]>
  implements DbCollectionStore<SelectClients, InsertClients, ClientsSortField, FilterClients>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Billing.Clients.ClientsSchema,
      foreignKeyColumn: DbSchema.Billing.Clients.ClientsSchema.organizationId,
    });
  }

  static create(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>): DbCollectionClients {
    return new this(args);
  }

  list({
    filters,
    ...args
  }: DbListArgs<ClientsSortField, FilterClients>): Promise<Result<SelectClients[]>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Billing.ClientsSchema.SelectClientsSchema,
      ...args,
      filters: {
        values: filters,
        schema: RecordsSchema.Billing.ClientsSchema.FilterClientsSchema,
        where: ({ type, search }) =>
          and(
            nonNullish(type) ? eq(this._table.type, type) : undefined,
            notEmptyString(search)
              ? or(
                  ilikeContains({ column: this._table.name, value: search }),
                  ilikeContains({ column: this._table.email, value: search }),
                )
              : undefined,
          ),
      },
    });
  }

  insert({ values }: { values: InsertClients }): Promise<Result<SelectClients>> {
    return this.__insertWithForeignKeyId({
      values,
      returningSchema: RecordsSchema.Billing.ClientsSchema.SelectClientsSchema,
    });
  }
}
