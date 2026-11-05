import { DbMaterializedView, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { sql } from "drizzle-orm";

export const refreshAccountBalances = async ({ db }: { db: PostgresDbInstance }): Promise<void> => {
  await db.execute(
    sql`REFRESH MATERIALIZED VIEW CONCURRENTLY ${DbMaterializedView.Ledger.AccountBalances.AccountBalancesMaterializedView};`,
  );
};
