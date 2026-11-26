import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { drizzle } from "drizzle-orm/bun-sql";
import { CryptoHasher, SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { join } from "node:path";
import { rm } from "node:fs/promises";
import { assertNonNullish } from "@usenullish/nullish-common";
import { envDataDir, envDbUrl } from "@usenullish/nullish-env";
import { CreateJournalService } from "@usenullish/nullish-engine/ledger";
import { AccountType, DbSchema, EXCHANGE_RATE_ONE } from "@usenullish/nullish-schema/db";
import { StoragePath } from "@usenullish/nullish-schema/jobs";
import {
  createBankRelation,
  createOrganization,
  resetDb,
  seedUser,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
} from "../../../_test-utils";
import { ExportsWorker } from "../../../../src/jobs/workers/exports/worker";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const accounts = DbSchema.Ledger.Accounts.AccountsSchema;
const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const clients = DbSchema.Billing.Clients.ClientsSchema;
const contacts = DbSchema.Billing.Clients.ContactsSchema;
const bankRelations = DbSchema.Core.Bank.BankRelationsSchema;
const statements = DbSchema.Banking.Statements.StatementsSchema;
const movements = DbSchema.Banking.Movements.MovementsSchema;

interface Seeded {
  contactId: string;
  movementId: string;
  journalEntryId: string;
  postingIds: string[];
}

const exportDir = ({ organizationId }: { organizationId: string }): string =>
  join(envDataDir(), StoragePath.Organizations, organizationId);

const readExport = async ({
  organizationId,
  exportId,
}: {
  organizationId: string;
  exportId: string;
}): Promise<Map<string, unknown[]>> => {
  const bytes = await Bun.file(join(exportDir({ organizationId }), `${exportId}.tar.gz`)).bytes();
  const files = await new Bun.Archive(bytes).files();

  const entries = await Promise.all(
    [...files].map(async ([path, file]) => [path, JSON.parse(await file.text())] as const),
  );

  return new Map(entries);
};

const runExport = async ({
  organizationId,
  userId = TEST_USER_ID,
}: {
  organizationId: string;
  userId?: string;
}): Promise<Map<string, unknown[]>> => {
  const result = await ExportsWorker.create({ db, payload: { userId, organizationId } }).run();

  if (result.status === "error") {
    throw result.err;
  }

  return await readExport({ organizationId, exportId: result.result.exportId });
};

const idsOf = (rows: unknown[] | undefined): string[] =>
  (rows ?? []).map((row) => (row as { id: string }).id);

const seedContact = async ({ organizationId }: { organizationId: string }): Promise<string> => {
  const [clientRow] = await db
    .insert(clients)
    .values({ organizationId, name: "Client with contact" })
    .returning();
  assertNonNullish(clientRow);

  const [contact] = await db
    .insert(contacts)
    .values({ organizationId, clientId: clientRow.id, lastName: "Muster" })
    .returning();
  assertNonNullish(contact);

  return contact.id;
};

const seedMovement = async ({ organizationId }: { organizationId: string }): Promise<string> => {
  const bankRelationId = await createBankRelation({ db, organizationId });

  const [statement] = await db
    .insert(statements)
    .values({
      organizationId,
      bankRelationId,
      bankMessageId: crypto.randomUUID(),
      bankStatementId: crypto.randomUUID(),
      startOn: new Date("2026-01-01"),
      endOn: new Date("2026-01-31"),
      openingBalance: 0n,
      closingBalance: 10000n,
      currency: "CHF",
    })
    .returning();
  assertNonNullish(statement);

  const [movement] = await db
    .insert(movements)
    .values({
      organizationId,
      bankRelationId,
      statementId: statement.id,
      bankReference: crypto.randomUUID(),
      dedupeHash: new CryptoHasher("sha256").update(crypto.randomUUID()).digest("hex"),
      bookedOn: new Date("2026-01-15"),
      amount: 10000n,
      currency: "CHF",
    })
    .returning();
  assertNonNullish(movement);

  return movement.id;
};

const seedJournal = async ({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}): Promise<Pick<Seeded, "journalEntryId" | "postingIds">> => {
  await db.insert(periods).values({
    organizationId,
    startOn: new Date("2026-01-01"),
    endOn: new Date("2026-12-31"),
  });

  const [bankRelation] = await db
    .select({ accountId: bankRelations.accountId })
    .from(bankRelations)
    .where(eq(bankRelations.organizationId, organizationId));
  assertNonNullish(bankRelation);

  const rows = await db
    .select({ id: accounts.id, parentId: accounts.parentId, type: accounts.type })
    .from(accounts)
    .where(eq(accounts.organizationId, organizationId));
  const parentIds = new Set(rows.map(({ parentId }) => parentId));
  const [income] = rows.filter(({ id, type }) => type === AccountType.INCOME && !parentIds.has(id));
  assertNonNullish(income);

  const result = await CreateJournalService.create({ db, userId, organizationId }).create({
    values: {
      entry: { validOn: new Date("2026-01-15"), reference: "SALE" },
      postings: [
        {
          accountId: bankRelation.accountId,
          description: "Sale",
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
          vatRateId: null,
          debit: 10000n,
          credit: 0n,
        },
        {
          accountId: income.id,
          description: "Sale",
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
          vatRateId: null,
          debit: 0n,
          credit: 10000n,
        },
      ],
    },
  });

  if (result.status === "error") {
    throw result.err;
  }

  const {
    result: { entry, postings },
  } = result;

  return { journalEntryId: entry.id, postingIds: postings.map(({ id }) => id) };
};

const seed = async ({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: string;
}): Promise<Seeded> => {
  const contactId = await seedContact({ organizationId });
  const movementId = await seedMovement({ organizationId });
  const journal = await seedJournal({ organizationId, userId });

  return { contactId, movementId, ...journal };
};

describe("ExportsWorker", () => {
  let organizationId: string;
  let otherOrganizationId: string;
  let seeded: Seeded;
  let otherSeeded: Seeded;
  let files: Map<string, unknown[]>;

  beforeAll(async () => {
    await resetDb({ db });
    await seedUser({ db });
    await seedUser({ db, userId: TEST_OTHER_USER_ID });

    organizationId = await createOrganization({ db, withAddress: true });
    otherOrganizationId = await createOrganization({
      db,
      withAddress: true,
      userId: TEST_OTHER_USER_ID,
    });

    seeded = await seed({ organizationId, userId: TEST_USER_ID });
    otherSeeded = await seed({ organizationId: otherOrganizationId, userId: TEST_OTHER_USER_ID });

    files = await runExport({ organizationId });
  });

  afterAll(async () => {
    await rm(exportDir({ organizationId }), { recursive: true, force: true });
    await rm(exportDir({ organizationId: otherOrganizationId }), { recursive: true, force: true });
    await resetDb({ db });
    await client.close();
  });

  test("exports the contacts of the clients", () => {
    expect(idsOf(files.get("billing/contacts.json"))).toEqual([seeded.contactId]);
  });

  test("exports the movements of the bank relations", () => {
    expect(idsOf(files.get("banking/movements.json"))).toEqual([seeded.movementId]);
  });

  test("exports the journal entries and their postings", () => {
    expect(idsOf(files.get("ledger/journal_entries.json"))).toEqual([seeded.journalEntryId]);
    expect(idsOf(files.get("ledger/postings.json")).sort()).toEqual([...seeded.postingIds].sort());
    expect(files.get("ledger/postings.json")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          journalEntryId: seeded.journalEntryId,
          debit: { __bigint__: "10000" },
        }),
      ]),
    );
  });

  test("exports none of the rows of another organization", () => {
    const exported = JSON.stringify([...files.values()]);

    expect(exported).not.toContain(otherOrganizationId);
    expect(exported).not.toContain(otherSeeded.contactId);
    expect(exported).not.toContain(otherSeeded.movementId);
    expect(exported).not.toContain(otherSeeded.journalEntryId);
  });

  test("returns an error when the user is not a member of the organization", async () => {
    const result = await ExportsWorker.create({
      db,
      payload: { userId: TEST_OTHER_USER_ID, organizationId },
    }).run();

    expect(result.status).toBe("error");
  });

  describe("pagination", () => {
    let largeOrganizationId: string;
    let clientIds: string[];

    beforeAll(async () => {
      largeOrganizationId = await createOrganization({ db, withAddress: true });

      const rows = await db
        .insert(clients)
        .values(
          Array.from({ length: 1001 }, (_, index) => ({
            organizationId: largeOrganizationId,
            name: `Client ${index}`,
          })),
        )
        .returning({ id: clients.id });

      clientIds = rows.map(({ id }) => id);
    });

    afterAll(async () => {
      await rm(exportDir({ organizationId: largeOrganizationId }), {
        recursive: true,
        force: true,
      });
    });

    test("exports every row of a table larger than a page", async () => {
      const largeFiles = await runExport({ organizationId: largeOrganizationId });

      const exportedIds = idsOf(largeFiles.get("billing/clients.json"));

      expect(exportedIds).toHaveLength(1001);
      expect(exportedIds.sort()).toEqual([...clientIds].sort());
    });
  });
});
