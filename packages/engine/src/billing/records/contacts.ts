import { notEmptyString, type Option, type Result } from "@usenullish/nullish-common";
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
import { DbChildCollectionRecordsById } from "../../_records/child-collection-records-by-id";
import { DbRecordsById } from "../../_records/records-by-id";
import type { DbRecordsSortField } from "../../_records/records";
import { and, or } from "drizzle-orm";
import { ilikeContains } from "../../_query/helpers";

type SelectContacts = Records["Billing"]["Contacts"]["Select"];
type InsertContacts = Records["Billing"]["Contacts"]["Insert"];
type UpdateContacts = Records["Billing"]["Contacts"]["Update"];

type ContactsSortField = DbRecordsSortField<Db["Billing"]["Contacts"]>;
type FilterContacts = Records["Billing"]["Contacts"]["Filter"];

type SelectClients = Records["Billing"]["Clients"]["Select"];

export class DbContacts
  extends DbRecordsById<Db["Billing"]["Contacts"]>
  implements
    DbStore<SelectContacts, SelectContacts["id"], UpdateContacts>,
    DbDeletableStore<SelectContacts, SelectContacts["id"]>
{
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Billing.Clients.ContactsSchema,
    });
  }

  static create(args: DbStoreInitArgs): DbContacts {
    return new this(args);
  }

  find({ pKey: id }: { pKey: SelectContacts["id"] }): Promise<Result<Option<SelectContacts>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Billing.ClientsSchema.SelectContactsSchema,
    });
  }

  delete({ pKey: id }: { pKey: SelectContacts["id"] }): Promise<Result<Option<SelectContacts>>> {
    return this._deleteAndReturnOneById({
      id,
      returningSchema: RecordsSchema.Billing.ClientsSchema.SelectContactsSchema,
    });
  }

  update({
    values,
    pKey: id,
  }: {
    values: Pick<UpdateContacts, "version"> & Partial<Omit<UpdateContacts, "version">>;
    pKey: SelectContacts["id"];
  }): Promise<Result<SelectContacts>> {
    return this._updateAndReturnOneById({
      id,
      values,
      returningSchema: RecordsSchema.Billing.ClientsSchema.SelectContactsSchema,
    });
  }
}

export class DbCollectionContacts
  extends DbChildCollectionRecordsById<Db["Billing"]["Contacts"], SelectClients["id"]>
  implements DbCollectionStore<SelectContacts, InsertContacts, ContactsSortField, FilterContacts>
{
  private constructor(args: DbCollectionStoreInitArgs<SelectClients["id"]>) {
    super({
      ...args,
      table: DbSchema.Billing.Clients.ContactsSchema,
      foreignKeyColumn: DbSchema.Billing.Clients.ContactsSchema.clientId,
      parentTable: DbSchema.Billing.Clients.ClientsSchema,
    });
  }

  static create(args: DbCollectionStoreInitArgs<SelectClients["id"]>): DbCollectionContacts {
    return new this(args);
  }

  list({
    filters,
    ...args
  }: DbListArgs<ContactsSortField, FilterContacts>): Promise<Result<SelectContacts[]>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Billing.ClientsSchema.SelectContactsSchema,
      ...args,
      filters: {
        values: filters,
        schema: RecordsSchema.Billing.ClientsSchema.FilterContactsSchema,
        where: ({ search }) =>
          and(
            notEmptyString(search)
              ? or(
                  ilikeContains({ column: this._table.lastName, value: search }),
                  ilikeContains({ column: this._table.firstName, value: search }),
                  ilikeContains({ column: this._table.email, value: search }),
                )
              : undefined,
          ),
      },
    });
  }

  insert({ values }: { values: InsertContacts }): Promise<Result<SelectContacts>> {
    return this.__insertWithForeignKeyId({
      values,
      returningSchema: RecordsSchema.Billing.ClientsSchema.SelectContactsSchema,
    });
  }
}
