import { DbUserContext, type DbUserContextArgs } from "@usenullish/nullish-db";
import type { Result } from "@usenullish/nullish-common";
import { DbMaterializedView } from "@usenullish/nullish-schema/db";

export abstract class ServiceContext extends DbUserContext {
  protected constructor(args: DbUserContextArgs) {
    super(args);
  }

  protected async _withViewRefresh<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
    return this._withRefresh({
      view: DbMaterializedView.Ledger.AccountBalances.AccountBalancesMaterializedView,
      fn,
    });
  }
}
