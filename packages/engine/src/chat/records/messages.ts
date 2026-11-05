import { and, eq, getColumns, sql } from "drizzle-orm";
import { assertNonNullish, type Result, tryCatch } from "@usenullish/nullish-common";
import { DbUserContext } from "@usenullish/nullish-db";
import { DbSchema, queryArgsSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type { DbCollectionStore, DbCollectionStoreInitArgs, DbListArgs } from "../../store";
import type { DbRecordsSortField } from "../../_records/records";
import { parseFilters, parseQueryArgs } from "../../_query/helpers";
import { buildMessagesWhere } from "../_helpers/messages";

type SelectMessages = Records["Chat"]["Messages"]["Select"];
type InsertMessages = Records["Chat"]["Messages"]["Insert"];
type FilterMessages = Records["Chat"]["Messages"]["Filter"];
type ConversationId = Records["Chat"]["Conversations"]["Select"]["id"];

type MessagesSortField = DbRecordsSortField<typeof DbSchema.Chat.Messages.MessagesSchema>;

export class DbCollectionMessages
  extends DbUserContext
  implements DbCollectionStore<SelectMessages, InsertMessages, MessagesSortField, FilterMessages>
{
  readonly #table = DbSchema.Chat.Messages.MessagesSchema;
  readonly #conversationId: ConversationId;
  readonly #queryArgsSchema = queryArgsSchema(
    Object.keys(getColumns(DbSchema.Chat.Messages.MessagesSchema)) as [
      MessagesSortField,
      ...MessagesSortField[],
    ],
  );

  private constructor({ foreignKeyId, ...rest }: DbCollectionStoreInitArgs<ConversationId>) {
    super(rest);

    this.#conversationId = foreignKeyId;
  }

  static create(args: DbCollectionStoreInitArgs<ConversationId>): DbCollectionMessages {
    return new this(args);
  }

  list({
    pagination,
    sort,
    filters,
  }: DbListArgs<MessagesSortField, FilterMessages>): Promise<Result<SelectMessages[]>> {
    return tryCatch(async () => {
      const {
        pagination: { limit, offset },
        orderBy,
      } = parseQueryArgs({
        args: { pagination, sort },
        schema: this.#queryArgsSchema,
        table: this.#table,
        pKey: this.#table.id,
      });

      const { where: filtersWhere } = parseFilters({
        values: filters,
        schema: RecordsSchema.Chat.MessagesSchema.FilterMessagesSchema,
        where: buildMessagesWhere,
      });

      return await this._withAuth(async (tx) => {
        const rows = await tx
          .select()
          .from(this.#table)
          .where(and(eq(this.#table.conversationId, this.#conversationId), filtersWhere))
          .orderBy(...orderBy)
          .limit(limit)
          .offset(offset);

        return rows.map((row) => RecordsSchema.Chat.MessagesSchema.SelectMessagesSchema.parse(row));
      });
    });
  }

  insert({ values }: { values: InsertMessages }): Promise<Result<SelectMessages>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const [row] = await tx
          .insert(this.#table)
          .values({
            ...values,
            conversationId: this.#conversationId,
            position: sql`(SELECT COALESCE(MAX(${this.#table.position}), -1) + 1 FROM ${this.#table} WHERE ${this.#table.conversationId} = ${this.#conversationId})`,
          })
          .returning();

        assertNonNullish(row);

        return RecordsSchema.Chat.MessagesSchema.SelectMessagesSchema.parse(row);
      });
    });
  }
}
