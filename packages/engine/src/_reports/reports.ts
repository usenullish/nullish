import { DbUserContext, type DbUserContextArgs, selectMany } from "@usenullish/nullish-db";
import { type Result, tryCatch } from "@usenullish/nullish-common";
import { type SQL } from "drizzle-orm";
import type { PgView, SelectedFields } from "drizzle-orm/pg-core";
import type * as z from "zod";

export type DbReportArgs = DbUserContextArgs;

export abstract class DbReports<TView extends PgView> extends DbUserContext {
  readonly #view: TView;

  protected constructor({ view, ...rest }: DbReportArgs & { view: TView }) {
    super(rest);

    this.#view = view;
  }

  protected get _view(): TView {
    return this.#view;
  }

  protected async _query<T, Selection extends SelectedFields>(args: {
    schema: z.ZodType<T>;
    where?: SQL;
    selection?: Selection;
  }): Promise<Result<T[]>> {
    return tryCatch(async () => {
      return await this._withAuth(async (tx) => {
        return await selectMany({ tx, table: this.#view, ...args });
      });
    });
  }
}
