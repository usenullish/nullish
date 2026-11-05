import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { and, eq, sql } from "drizzle-orm";
import { assertNonNullish, encodeWithCodecs } from "@usenullish/nullish-common";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  ClientType,
  DbMaterializedView,
  DbSchema,
  EXCHANGE_RATE_ONE,
  MigrationDatasetType,
  MigrationProvider,
  MigrationStatus,
} from "@usenullish/nullish-schema/db";
import { MigrationSchema } from "@usenullish/nullish-schema/migration";
import { createOrganization, resetDb, seedUser, TEST_USER_ID } from "../../../_test-utils";
import { MigrationsWorker } from "../../../../src/jobs/workers/migrations/worker";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const migrations = DbSchema.Migration.Migrations.MigrationsSchema;
const datasets = DbSchema.Migration.Datasets.DatasetsSchema;
const clients = DbSchema.Billing.Clients.ClientsSchema;
const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const accounts = DbSchema.Ledger.Accounts.AccountsSchema;
const journalEntries = DbSchema.Ledger.Journal.JournalEntriesSchema;
const postings = DbSchema.Ledger.Journal.PostingsSchema;
const accountBalances = DbMaterializedView.Ledger.AccountBalances.AccountBalancesMaterializedView;

describe("MigrationsWorker", () => {
  let organizationId: string;
  let migrationId: string;

  beforeAll(async () => {
    await resetDb({ db });
    await seedUser({ db });
  });

  afterAll(async () => {
    await resetDb({ db });
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization({ db, withAddress: false });

    const [migration] = await db
      .insert(migrations)
      .values({ organizationId, userId: TEST_USER_ID, provider: MigrationProvider.BEXIO })
      .returning();
    assertNonNullish(migration);
    migrationId = migration.id;
  });

  const addClientsDataset = ({ data }: { data: unknown }) =>
    db.insert(datasets).values({
      organizationId,
      migrationId,
      type: MigrationDatasetType.CLIENTS,
      name: "clients.csv",
      data,
    });

  const clientsData = encodeWithCodecs({
    schema: MigrationSchema.Foreign.ForeignClientsSchema,
    value: [{ type: ClientType.COMPANY, name: "Muster AG", contacts: [] }],
  });

  const setStatus = (status: MigrationStatus) =>
    db.update(migrations).set({ status }).where(eq(migrations.id, migrationId));

  const statusOf = async (): Promise<MigrationStatus | undefined> => {
    const [row] = await db.select().from(migrations).where(eq(migrations.id, migrationId));
    return row?.status;
  };

  const importedClients = async () => {
    const rows = await db.select().from(clients).where(eq(clients.organizationId, organizationId));
    return rows.map(({ name }) => name);
  };

  const run = () =>
    MigrationsWorker.create({ db, payload: { userId: TEST_USER_ID, migrationId } }).run();

  const openPeriod = () =>
    db.insert(periods).values({
      organizationId,
      startOn: new Date(Date.UTC(2026, 0, 1)),
      endOn: new Date(Date.UTC(2026, 11, 31)),
    });

  const accountId = async (code: string): Promise<string> => {
    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.organizationId, organizationId), eq(accounts.code, code)));
    assertNonNullish(account);
    return account.id;
  };

  const balancesOf = async (code: string) =>
    db
      .select({ balance: accountBalances.balance })
      .from(accountBalances)
      .where(eq(accountBalances.accountId, await accountId(code)));

  const bookDirectly = async () => {
    const debitAccountId = await accountId("1020");
    const creditAccountId = await accountId("2800");

    await db.transaction(async (tx) => {
      await tx.execute(sql`SELECT auth.set_current_user_id(${TEST_USER_ID})`);

      const [entry] = await tx
        .insert(journalEntries)
        .values({ organizationId, validOn: new Date(Date.UTC(2026, 5, 1)), reference: "TEST" })
        .returning();
      assertNonNullish(entry);

      await tx.insert(postings).values([
        {
          organizationId,
          journalEntryId: entry.id,
          accountId: debitAccountId,
          debit: 100000n,
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
        },
        {
          organizationId,
          journalEntryId: entry.id,
          accountId: creditAccountId,
          credit: 100000n,
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
        },
      ]);
    });
  };

  const balancesData = encodeWithCodecs({
    schema: MigrationSchema.Foreign.ForeignOpeningBalancesSchema,
    value: {
      validOn: new Date(Date.UTC(2026, 0, 1)),
      balances: [
        { code: "1020", amount: 1000 },
        { code: "2800", amount: -1000 },
      ],
    },
  });

  test("imports the datasets and marks the migration as succeeded", async () => {
    await addClientsDataset({ data: clientsData });

    const result = await run();

    expect(result).toEqual({ status: "success", result: undefined });
    expect(await statusOf()).toBe(MigrationStatus.SUCCEEDED);
    expect(await importedClients()).toEqual(["Muster AG"]);
  });

  test("marks the migration as failed when the import throws", async () => {
    await addClientsDataset({ data: [{ name: "" }] });

    const result = await run();

    expect(result.status).toBe("error");
    expect(await statusOf()).toBe(MigrationStatus.FAILED);
  });

  test("runs a failed migration again", async () => {
    await addClientsDataset({ data: clientsData });
    await setStatus(MigrationStatus.FAILED);

    const result = await run();

    expect(result).toEqual({ status: "success", result: undefined });
    expect(await statusOf()).toBe(MigrationStatus.SUCCEEDED);
  });

  test("refreshes the account balances after importing opening balances", async () => {
    await openPeriod();
    await db.insert(datasets).values({
      organizationId,
      migrationId,
      type: MigrationDatasetType.BALANCES,
      name: "balances.xlsx",
      data: balancesData,
    });

    const result = await run();

    expect(result).toEqual({ status: "success", result: undefined });
    expect(await balancesOf("1020")).not.toHaveLength(0);
  });

  test("does not refresh the account balances when nothing is posted", async () => {
    await openPeriod();
    await bookDirectly();
    await addClientsDataset({ data: clientsData });

    const result = await run();

    expect(result).toEqual({ status: "success", result: undefined });
    expect(await balancesOf("1020")).toHaveLength(0);
  });

  test("refuses a migration that already succeeded and changes nothing", async () => {
    await addClientsDataset({ data: clientsData });
    await setStatus(MigrationStatus.SUCCEEDED);

    const result = await run();

    expect(result.status).toBe("error");
    expect(await statusOf()).toBe(MigrationStatus.SUCCEEDED);
    expect(await importedClients()).toEqual([]);
  });
});
