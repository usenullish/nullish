import { selectMany, type Tx } from "@usenullish/nullish-db";
import { type Nullable, type Result, tryCatch } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { eq, sql } from "drizzle-orm";

type Account = Records["Ledger"]["Accounts"]["Select"];
type SystemAccount = Records["Ledger"]["SystemAccounts"]["Select"];

export const listAccountsByOrgId = async ({
  tx,
  organizationId,
}: { tx: Tx } & Pick<Account, "organizationId">): Promise<Result<Account[]>> => {
  return tryCatch(async () => {
    return selectMany({
      tx,
      table: DbSchema.Ledger.Accounts.AccountsSchema,
      schema: RecordsSchema.Ledger.AccountsSchema.SelectAccountsSchema,
      where: eq(DbSchema.Ledger.Accounts.AccountsSchema.organizationId, organizationId),
    });
  });
};

export const createAccounts = async ({
  tx,
  organizationId,
  accounts,
}: {
  tx: Tx;
  organizationId: Account["organizationId"];
  accounts: [Pick<Account, "code" | "type" | "name">, ...Pick<Account, "code" | "type" | "name">[]];
}): Promise<Result<void>> => {
  return tryCatch(async () => {
    await tx.insert(DbSchema.Ledger.Accounts.AccountsSchema).values(
      accounts.map(({ code, type, name }) => ({
        organizationId,
        code,
        type,
        name,
      })),
    );
  });
};

export const updateAccounts = async ({
  tx,
  accounts,
}: {
  tx: Tx;
  accounts: [Pick<Account, "id" | "type" | "name">, ...Pick<Account, "id" | "type" | "name">[]];
}): Promise<Result<void>> => {
  return tryCatch(async () => {
    for (const { id, type, name } of accounts) {
      await tx
        .update(DbSchema.Ledger.Accounts.AccountsSchema)
        .set({ type, name })
        .where(eq(DbSchema.Ledger.Accounts.AccountsSchema.id, id));
    }
  });
};

type AccountCodes = Pick<Account, "code"> & {
  parentCode: Nullable<Account["code"]>;
};

export const updateAccountParents = async ({
  tx,
  organizationId,
  links,
}: {
  tx: Tx;
  organizationId: Account["organizationId"];
  links: [AccountCodes, ...AccountCodes[]];
}): Promise<Result<void>> => {
  return tryCatch(async () => {
    const values = sql.join(
      links.map(({ code, parentCode }) => sql`(${code}::text, ${parentCode ?? null}::text)`),
      sql`, `,
    );

    // AND a.parent_id IS DISTINCT FROM p.id predicate is a filter
    // - New account, no parentCode → p is null, a.parent_id is already null → not distinct → 0 rows written.
    // - Updated account, only type changed → resolved parent equals current parent_id → not distinct → 0 rows written.
    // - New account with parentCode / parent actually changed → distinct → written (exactly the ones you listed).
    await tx.execute(sql`
      UPDATE ledger.accounts AS a
      SET parent_id = p.id
      FROM (VALUES ${values}) AS v (code, parent_code)
      LEFT JOIN ledger.accounts AS p
        ON p.organization_id = ${organizationId}
       AND p.code = v.parent_code
       AND p.code <> v.code
      WHERE a.organization_id = ${organizationId}
        AND a.code = v.code
        AND a.parent_id IS DISTINCT FROM p.id
    `);
  });
};

type SystemAccountCode = Pick<SystemAccount, "purpose"> & Pick<Account, "code">;

export const updateSystemAccounts = async ({
  tx,
  organizationId,
  bindings,
}: {
  tx: Tx;
  organizationId: SystemAccount["organizationId"];
  bindings: [SystemAccountCode, ...SystemAccountCode[]];
}): Promise<Result<void>> => {
  return tryCatch(async () => {
    const values = sql.join(
      bindings.map(({ purpose, code }) => sql`(${purpose}::text, ${code}::text)`),
      sql`, `,
    );

    await tx.execute(sql`
      UPDATE ledger.system_accounts AS sa
      SET account_id = a.id
      FROM (VALUES ${values}) AS v (purpose, code)
      JOIN ledger.accounts AS a
        ON a.organization_id = ${organizationId}
       AND a.code = v.code
      WHERE sa.organization_id = ${organizationId}
        AND sa.purpose::text = v.purpose
        AND sa.account_id IS DISTINCT FROM a.id
    `);
  });
};

export const listSystemAccountsByOrgId = async ({
  tx,
  organizationId,
}: { tx: Tx } & Pick<SystemAccount, "organizationId">): Promise<Result<SystemAccount[]>> => {
  return tryCatch(async () => {
    return selectMany({
      tx,
      table: DbSchema.Ledger.SystemAccounts.SystemAccountsSchema,
      schema: RecordsSchema.Ledger.SystemAccountsSchema.SelectSystemAccountsSchema,
      where: eq(DbSchema.Ledger.SystemAccounts.SystemAccountsSchema.organizationId, organizationId),
    });
  });
};
