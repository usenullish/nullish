import { getColumns } from "drizzle-orm";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { DbUserContext } from "@usenullish/nullish-db";
import { DbSchema, queryArgsSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import type { DbListArgs, DbStoreInitArgs } from "../../store";
import type { DbRecordsSortField } from "../../_records/records";
import { parseQueryArgs } from "../../_query/helpers";

type SelectLlmUsages = Records["Metering"]["LlmUsages"]["Select"];

type LlmUsagesSortField = DbRecordsSortField<typeof DbSchema.Metering.LlmUsages.LlmUsagesSchema>;

export class DbLlmUsages extends DbUserContext {
  readonly #table = DbSchema.Metering.LlmUsages.LlmUsagesSchema;
  readonly #queryArgsSchema = queryArgsSchema(
    Object.keys(getColumns(DbSchema.Metering.LlmUsages.LlmUsagesSchema)) as [
      LlmUsagesSortField,
      ...LlmUsagesSortField[],
    ],
  );

  private constructor(args: DbStoreInitArgs) {
    super(args);
  }

  static create(args: DbStoreInitArgs): DbLlmUsages {
    return new this(args);
  }

  list({ pagination, sort }: DbListArgs<LlmUsagesSortField>): Promise<Result<SelectLlmUsages[]>> {
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

      return await this._withAuth(async (tx) => {
        const rows = await tx
          .select()
          .from(this.#table)
          .orderBy(...orderBy)
          .limit(limit)
          .offset(offset);

        return rows.map((row) =>
          RecordsSchema.Metering.LlmUsagesSchema.SelectLlmUsagesSchema.parse(row),
        );
      });
    });
  }
}
