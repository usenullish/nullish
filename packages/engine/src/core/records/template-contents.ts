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
import { DbChildCollectionRecordsById } from "../../_records/child-collection-records-by-id";
import { DbRecordsById } from "../../_records/records-by-id";
import type { DbRecordsSortField } from "../../_records/records";
import { and, eq } from "drizzle-orm";

type SelectTemplateContents = Records["Core"]["TemplateContents"]["Select"];
type InsertTemplateContents = Records["Core"]["TemplateContents"]["Insert"];
type UpdateTemplateContents = Records["Core"]["TemplateContents"]["Update"];

type TemplateContentsSortField = DbRecordsSortField<Db["Core"]["TemplateContents"]>;
type FilterTemplateContents = Records["Core"]["TemplateContents"]["Filter"];

type SelectDocumentTemplates = Records["Core"]["DocumentTemplates"]["Select"];

export class DbTemplateContents
  extends DbRecordsById<Db["Core"]["TemplateContents"]>
  implements
    DbStore<SelectTemplateContents, SelectTemplateContents["id"], UpdateTemplateContents>,
    DbDeletableStore<SelectTemplateContents, SelectTemplateContents["id"]>
{
  private constructor(args: DbStoreInitArgs) {
    super({
      ...args,
      table: DbSchema.Core.Documents.TemplateContentsSchema,
    });
  }

  static create(args: DbStoreInitArgs): DbTemplateContents {
    return new this(args);
  }

  find({
    pKey: id,
  }: {
    pKey: SelectTemplateContents["id"];
  }): Promise<Result<Option<SelectTemplateContents>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Core.DocumentsSchema.SelectTemplateContentsSchema,
    });
  }

  delete({
    pKey: id,
  }: {
    pKey: SelectTemplateContents["id"];
  }): Promise<Result<Option<SelectTemplateContents>>> {
    return this._deleteAndReturnOneById({
      id,
      returningSchema: RecordsSchema.Core.DocumentsSchema.SelectTemplateContentsSchema,
    });
  }

  update({
    values,
    pKey: id,
  }: {
    values: Pick<UpdateTemplateContents, "version"> &
      Partial<Omit<UpdateTemplateContents, "version">>;
    pKey: SelectTemplateContents["id"];
  }): Promise<Result<SelectTemplateContents>> {
    return this._updateAndReturnOneById({
      id,
      values,
      returningSchema: RecordsSchema.Core.DocumentsSchema.SelectTemplateContentsSchema,
    });
  }
}

export class DbCollectionTemplateContents
  extends DbChildCollectionRecordsById<
    Db["Core"]["TemplateContents"],
    SelectDocumentTemplates["id"]
  >
  implements
    DbCollectionStore<
      SelectTemplateContents,
      InsertTemplateContents,
      TemplateContentsSortField,
      FilterTemplateContents
    >
{
  private constructor(args: DbCollectionStoreInitArgs<SelectDocumentTemplates["id"]>) {
    super({
      ...args,
      table: DbSchema.Core.Documents.TemplateContentsSchema,
      foreignKeyColumn: DbSchema.Core.Documents.TemplateContentsSchema.templateId,
      parentTable: DbSchema.Core.Documents.DocumentTemplatesSchema,
    });
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectDocumentTemplates["id"]>,
  ): DbCollectionTemplateContents {
    return new this(args);
  }

  list({
    filters,
    ...args
  }: DbListArgs<TemplateContentsSortField, FilterTemplateContents>): Promise<
    Result<SelectTemplateContents[]>
  > {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Core.DocumentsSchema.SelectTemplateContentsSchema,
      ...args,
      filters: {
        values: filters,
        schema: RecordsSchema.Core.DocumentsSchema.FilterTemplateContentsSchema,
        where: ({ language }) =>
          and(nonNullish(language) ? eq(this._table.language, language) : undefined),
      },
    });
  }

  insert({ values }: { values: InsertTemplateContents }): Promise<Result<SelectTemplateContents>> {
    return this.__insertWithForeignKeyId({
      values,
      returningSchema: RecordsSchema.Core.DocumentsSchema.SelectTemplateContentsSchema,
    });
  }
}
