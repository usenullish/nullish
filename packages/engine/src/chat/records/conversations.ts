import { isNull, sql } from "drizzle-orm";
import { assertNonNullish, type Option, type Result, tryCatch } from "@usenullish/nullish-common";
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

type SelectConversations = Records["Chat"]["Conversations"]["Select"];
type InsertConversations = Records["Chat"]["Conversations"]["Insert"];
type UpdateConversations = Records["Chat"]["Conversations"]["Update"];
type ConversationsSortField = DbRecordsSortField<Db["Chat"]["Conversations"]>;

type SelectOrganizations = Records["Core"]["Organizations"]["Select"];

export class DbConversations
  extends DbRecordsById<Db["Chat"]["Conversations"]>
  implements
    DbStore<SelectConversations, SelectConversations["id"], UpdateConversations>,
    DbDeletableStore<SelectConversations, SelectConversations["id"]>,
    DbCollectionStore<SelectConversations, InsertConversations, ConversationsSortField>
{
  private constructor(args: DbStoreInitArgs) {
    super({ ...args, table: DbSchema.Chat.Conversations.ConversationsSchema });
  }

  static create(args: DbStoreInitArgs): DbConversations {
    return new this(args);
  }

  find({
    pKey: id,
  }: {
    pKey: SelectConversations["id"];
  }): Promise<Result<Option<SelectConversations>>> {
    return this._queryOneById({
      id,
      schema: RecordsSchema.Chat.ConversationsSchema.SelectConversationsSchema,
    });
  }

  delete({
    pKey: id,
  }: {
    pKey: SelectConversations["id"];
  }): Promise<Result<Option<SelectConversations>>> {
    return this._deleteAndReturnOneById({
      id,
      returningSchema: RecordsSchema.Chat.ConversationsSchema.SelectConversationsSchema,
    });
  }

  list(args: DbListArgs<ConversationsSortField>): Promise<Result<SelectConversations[]>> {
    return this._query({
      schema: RecordsSchema.Chat.ConversationsSchema.SelectConversationsSchema,
      ...args,
      where: isNull(this._table.organizationId),
    });
  }

  insert({ values }: { values: InsertConversations }): Promise<Result<SelectConversations>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const [row] = await tx
          .insert(DbSchema.Chat.Conversations.ConversationsSchema)
          .values({ ...values, userId: sql`auth.current_user_id()` })
          .returning();

        assertNonNullish(row);

        return RecordsSchema.Chat.ConversationsSchema.SelectConversationsSchema.parse(row);
      });
    });
  }

  update({
    values,
    pKey: id,
  }: {
    values: Pick<UpdateConversations, "version"> & Partial<Omit<UpdateConversations, "version">>;
    pKey: SelectConversations["id"];
  }): Promise<Result<SelectConversations>> {
    return this._updateAndReturnOneById({
      id,
      values,
      returningSchema: RecordsSchema.Chat.ConversationsSchema.SelectConversationsSchema,
    });
  }
}

export class DbCollectionConversations extends DbCollectionRecordsById<
  Db["Chat"]["Conversations"],
  SelectOrganizations["id"]
> {
  private constructor(args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>) {
    super({
      ...args,
      table: DbSchema.Chat.Conversations.ConversationsSchema,
      foreignKeyColumn: DbSchema.Chat.Conversations.ConversationsSchema.organizationId,
    });
  }

  static create(
    args: DbCollectionStoreInitArgs<SelectOrganizations["id"]>,
  ): DbCollectionConversations {
    return new this(args);
  }

  list(args: DbListArgs<ConversationsSortField>): Promise<Result<SelectConversations[]>> {
    return this._queryWithForeignKeyId({
      schema: RecordsSchema.Chat.ConversationsSchema.SelectConversationsSchema,
      ...args,
    });
  }
}
