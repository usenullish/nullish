import type { DbAdminContext } from "@usenullish/nullish-db";
import { sql } from "drizzle-orm";
import { tryCatch } from "@usenullish/nullish-common";
import { DbMaterializedView } from "@usenullish/nullish-schema/db";
import { spinner } from "@clack/prompts";
import { exit } from "../utils/exit";

export const refreshAccountBalances = async ({ dbContext }: { dbContext: DbAdminContext }) => {
  const refresh = async () => {
    return await tryCatch(async () => {
      await dbContext.execSystem({
        sql: sql`REFRESH MATERIALIZED VIEW CONCURRENTLY ${DbMaterializedView.Ledger.AccountBalances.AccountBalancesMaterializedView};`,
      });
    });
  };

  const s = spinner();
  s.start("Updating account balances");

  const result = await refresh();

  if (result.status === "error") {
    s.stop();

    exit({
      msg: "Unexpected error: the account balance could not be triggered.",
      err: result.err,
    });
  }

  s.stop("Account balances updated");
};
