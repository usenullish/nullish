import { gte, sql } from "drizzle-orm";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { DbUserContext, type DbUserContextArgs } from "@usenullish/nullish-db";
import { envLlmEnabled, envLlmModel } from "@usenullish/nullish-env";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Reports, ReportsSchema } from "@usenullish/nullish-schema/reports";

export class LlmUsageReport extends DbUserContext {
  readonly #table = DbSchema.Metering.LlmUsages.LlmUsagesSchema;

  private constructor(args: DbUserContextArgs) {
    super(args);
  }

  static create(args: DbUserContextArgs): LlmUsageReport {
    return new this(args);
  }

  generate(
    args: Reports["Metering"]["LlmUsage"]["Args"],
  ): Promise<Result<Reports["Metering"]["LlmUsage"]["Result"]>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        const { from } = ReportsSchema.MeteringSchema.LlmUsageArgsSchema.parse(args);

        const models = envLlmEnabled() ? [envLlmModel()] : [];

        const rows = await tx
          .select({
            model: this.#table.model,
            inputTokens: sql<bigint>`COALESCE(SUM(${this.#table.inputTokens}), 0)::bigint`,
            outputTokens: sql<bigint>`COALESCE(SUM(${this.#table.outputTokens}), 0)::bigint`,
          })
          .from(this.#table)
          .where(gte(this.#table.loggedAt, from))
          .groupBy(this.#table.model)
          .orderBy(this.#table.model);

        const available = models.map(
          (model) =>
            rows.find((row) => row.model === model) ?? { model, inputTokens: 0n, outputTokens: 0n },
        );

        const unavailable = rows.filter(({ model }) => !models.includes(model));

        return ReportsSchema.MeteringSchema.LlmUsageResultSchema.parse([
          ...available,
          ...unavailable,
        ]);
      });
    });
  }
}
