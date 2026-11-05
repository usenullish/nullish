import { nonNullish, type Option, type Result } from "@usenullish/nullish-common";
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
import { and, eq } from "drizzle-orm";

type SelectDocumentTemplates = Records["Core"]["DocumentTemplates"]["Select"];
type InsertDocumentTemplates = Records["Core"]["DocumentTemplates"]["Insert"];
type UpdateDocumentTemplates = Records["Core"]["DocumentTemplates"]["Update"];

type DocumentTemplatesSortField = DbRecordsSortField<Db["Core"]["DocumentTemplates"]>;
type FilterDocumentTemplates = Records["Core"]["DocumentTemplates"]["Filter"];

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbDocumentTemplates
  extends DbRecordsById<Db["Core"]["DocumentTemplates"]>
  implements
    DbStore<SelectDocumentTemplates, SelectDocumentTemplates["id"], UpdateDocumentTemplates>,
    DbDeletableStore<SelectDocumentTemplates, SelectDocumentTemplates["id"]>
{
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Core.Documents.DocumentTemplatesSchema,
    });
  }

  static create(args: DbStoreInitArgs): DbDocumentTemplates {
    return new this(args);
  }

  find({
    pKey: id,
  }: {
    pKey: SelectDocumentTemplates["id"];
  }): Promise<Result<Option<SelectDocumentTemplates>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Core.DocumentsSchema.SelectDocumentTemplatesSchema,
    });
  }

  delete({
    pKey: id,
  }: {
    pKey: SelectDocumentTemplates["id"];
  }): Promise<Result<Option<SelectDocumentTemplates>>> {
    return this._deleteAndReturnOneById({
      id,
      returningSchema: RecordsSchema.Core.DocumentsSchema.SelectDocumentTemplatesSchema,
    });
  }

  update({
    values,
    pKey: id,
  }: {
    values: Pick<UpdateDocumentTemplates, "version"> &
      Partial<Omit<UpdateDocumentTemplates, "version">>;
    pKey: SelectDocumentTemplates["id"];
  }): Promise<Result<SelectDocumentTemplates>> {
    return this._updateAndReturnOneById({
      id,
      values,
      returningSchema: RecordsSchema.Core.DocumentsSchema.SelectDocumentTemplatesSchema,
    });
  }
}

export class DbCollectionDocumentTemplates
  extends DbCollectionRecordsById<Db["Core"]["DocumentTemplates"], SelectOrganizations["id"]>
  implements
    DbCollectionStore<
      SelectDocumentTemplates,
      InsertDocumentTemplates,
      DocumentTemplatesSortField,
      FilterDocumentTemplates
    >
{
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Core.Documents.DocumentTemplatesSchema,
      foreignKeyColumn: DbSchema.Core.Documents.DocumentTemplatesSchema.organizationId,
    });
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionDocumentTemplates {
    return new this(args);
  }

  list({
    filters,
    ...args
  }: DbListArgs<DocumentTemplatesSortField, FilterDocumentTemplates>): Promise<
    Result<SelectDocumentTemplates[]>
  > {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Core.DocumentsSchema.SelectDocumentTemplatesSchema,
      ...args,
      filters: {
        values: filters,
        schema: RecordsSchema.Core.DocumentsSchema.FilterDocumentTemplatesSchema,
        where: ({ type }) => and(nonNullish(type) ? eq(this._table.type, type) : undefined),
      },
    });
  }

  insert({
    values,
  }: {
    values: InsertDocumentTemplates;
  }): Promise<Result<SelectDocumentTemplates>> {
    return this.__insertWithForeignKeyId({
      values,
      returningSchema: RecordsSchema.Core.DocumentsSchema.SelectDocumentTemplatesSchema,
    });
  }
}
