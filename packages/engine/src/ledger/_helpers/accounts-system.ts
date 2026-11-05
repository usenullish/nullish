import type { Tx } from "@usenullish/nullish-db";
import { selectMany } from "@usenullish/nullish-db";
import { DbSchema, SystemAccountPurpose } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { eq } from "drizzle-orm";
import type { Option } from "@usenullish/nullish-common";

type SystemAccount = Records["Ledger"]["SystemAccounts"]["Select"];

type SystemAccountsByPurpose = Record<SystemAccountPurpose, Option<SystemAccount>>;

export const getSystemAccounts = async ({
  tx,
  organizationId,
}: { tx: Tx } & Pick<SystemAccount, "organizationId">): Promise<SystemAccountsByPurpose> => {
  const systemAccounts = await selectMany({
    tx,
    table: DbSchema.Ledger.SystemAccounts.SystemAccountsSchema,
    schema: RecordsSchema.Ledger.SystemAccountsSchema.SelectSystemAccountsSchema,
    where: eq(DbSchema.Ledger.SystemAccounts.SystemAccountsSchema.organizationId, organizationId),
  });

  return Object.values(SystemAccountPurpose).reduce<SystemAccountsByPurpose>(
    (acc, systemPurpose: SystemAccountPurpose) => ({
      ...acc,
      [systemPurpose]: systemAccounts.find(({ purpose }) => purpose === systemPurpose),
    }),
    {} as SystemAccountsByPurpose,
  );
};
