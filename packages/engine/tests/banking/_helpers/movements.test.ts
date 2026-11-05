import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { asc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { assertNonNullish } from "@usenullish/nullish-common";
import { BankMovementStatus, DbSchema } from "@usenullish/nullish-schema/db";
import {
  countUnreconciledMovements,
  getMovement,
  insertNotConflictingNewMovements,
  listMovements,
  updateMovement,
} from "../../../src/banking/_helpers/movements";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  TEST_MISSING_ID,
  TEST_USER_ID,
  createBankRelation,
  createBankStatement,
  createOrganization,
  randomDedupeHash,
  resetDb,
  seedUsers,
  dedupeHashOf,
} from "../../_test-utils";

const movements = DbSchema.Banking.Movements.MovementsSchema;

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("insertNotConflictingNewMovements", () => {
  let organizationId: string;
  let bankRelationId: string;
  let statementId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db, TEST_USER_ID);
    bankRelationId = await createBankRelation(db, organizationId);
    statementId = await createBankStatement(db, { organizationId, bankRelationId });
  });

  const movement = ({
    bankReference,
    amount,
    accountId = bankRelationId,
    accountStatementId = statementId,
  }: {
    bankReference: string;
    amount: bigint;
    accountId?: string;
    accountStatementId?: string;
  }) => ({
    organizationId,
    bankRelationId: accountId,
    statementId: accountStatementId,
    bankReference,
    dedupeHash: dedupeHashOf(bankReference),
    bookedOn: new Date("2026-10-05"),
    valueOn: null,
    amount,
    currency: "CHF",
    counterpartyName: null,
    counterpartyIban: null,
    creditorReference: null,
    communication: null,
    description: null,
  });

  test("inserts and returns new movements", async () => {
    const inserted = await db.transaction((tx) =>
      insertNotConflictingNewMovements({
        tx,
        values: [
          movement({ bankReference: "REF-1", amount: 108100n }),
          movement({ bankReference: "REF-2", amount: -1500n }),
        ],
      }),
    );

    expect(inserted.map(({ bankReference, amount }) => ({ bankReference, amount }))).toEqual([
      { bankReference: "REF-1", amount: 108100n },
      { bankReference: "REF-2", amount: -1500n },
    ]);
  });

  test("returns and inserts only the movements the bank relation does not have yet", async () => {
    await db.transaction((tx) =>
      insertNotConflictingNewMovements({
        tx,
        values: [movement({ bankReference: "REF-1", amount: 108100n })],
      }),
    );

    const inserted = await db.transaction((tx) =>
      insertNotConflictingNewMovements({
        tx,
        values: [
          movement({ bankReference: "REF-1", amount: 108100n }),
          movement({ bankReference: "REF-2", amount: -1500n }),
        ],
      }),
    );

    expect(inserted.map(({ bankReference }) => bankReference)).toEqual(["REF-2"]);

    const rows = await db
      .select()
      .from(movements)
      .where(eq(movements.bankRelationId, bankRelationId));
    expect(rows).toHaveLength(2);
  });

  test("inserts the same dedupe hash for another bank relation", async () => {
    const otherBankRelationId = await createBankRelation(db, organizationId, {
      iban: "CH5604835012345678009",
    });
    const otherStatementId = await createBankStatement(db, {
      organizationId,
      bankRelationId: otherBankRelationId,
    });
    await db.transaction((tx) =>
      insertNotConflictingNewMovements({
        tx,
        values: [movement({ bankReference: "REF-1", amount: 108100n })],
      }),
    );

    const inserted = await db.transaction((tx) =>
      insertNotConflictingNewMovements({
        tx,
        values: [
          movement({
            bankReference: "REF-1",
            amount: 108100n,
            accountId: otherBankRelationId,
            accountStatementId: otherStatementId,
          }),
        ],
      }),
    );

    expect(inserted.map(({ bankRelationId: accountId }) => accountId)).toEqual([
      otherBankRelationId,
    ]);
  });
});

describe("countUnreconciledMovements", () => {
  let organizationId: string;
  let bankRelationId: string;
  let otherBankRelationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db, TEST_USER_ID);
    bankRelationId = await createBankRelation(db, organizationId);
    otherBankRelationId = await createBankRelation(db, organizationId, {
      iban: "CH5604835012345678009",
    });
  });

  const insertMovements = async ({
    accountId,
    count,
  }: {
    accountId: string;
    count: number;
  }): Promise<string[]> => {
    const statementId = await createBankStatement(db, {
      organizationId,
      bankRelationId: accountId,
    });

    const rows = await db
      .insert(movements)
      .values(
        Array.from({ length: count }, (_, index) => ({
          organizationId,
          bankRelationId: accountId,
          statementId,
          bankReference: `${statementId}-${index}`,
          dedupeHash: dedupeHashOf(`${statementId}-${index}`),
          bookedOn: new Date("2026-10-05"),
          amount: 1000n,
          currency: "CHF",
        })),
      )
      .returning();

    return rows.map(({ id }) => id);
  };

  test("counts the unreconciled movements per bank relation", async () => {
    await insertMovements({ accountId: bankRelationId, count: 3 });
    await insertMovements({ accountId: otherBankRelationId, count: 1 });

    const counts = await db.transaction((tx) =>
      countUnreconciledMovements({ tx, bankRelationIds: [bankRelationId, otherBankRelationId] }),
    );

    expect(counts.get(bankRelationId)).toBe(3);
    expect(counts.get(otherBankRelationId)).toBe(1);
  });

  test("leaves out the ignored movements", async () => {
    const [ignoredId] = await insertMovements({ accountId: bankRelationId, count: 2 });
    if (ignoredId === undefined) return;
    await db
      .update(movements)
      .set({ status: BankMovementStatus.IGNORED })
      .where(eq(movements.id, ignoredId));

    const counts = await db.transaction((tx) =>
      countUnreconciledMovements({ tx, bankRelationIds: [bankRelationId] }),
    );

    expect(counts.get(bankRelationId)).toBe(1);
  });

  test("has no count for a bank relation without unreconciled movements", async () => {
    const counts = await db.transaction((tx) =>
      countUnreconciledMovements({ tx, bankRelationIds: [bankRelationId] }),
    );

    expect(counts.has(bankRelationId)).toBeFalse();
  });
});

describe("getMovement and updateMovement", () => {
  let organizationId: string;
  let bankRelationId: string;
  let statementId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db, TEST_USER_ID);
    bankRelationId = await createBankRelation(db, organizationId);
    statementId = await createBankStatement(db, { organizationId, bankRelationId });
  });

  afterAll(async () => {
    await resetDb(db);
  });

  const createMovement = async (): Promise<string> => {
    const [row] = await db
      .insert(movements)
      .values({
        organizationId,
        bankRelationId,
        statementId,
        bankReference: crypto.randomUUID(),
        dedupeHash: randomDedupeHash(),
        bookedOn: new Date("2026-10-05"),
        amount: 1000n,
        currency: "CHF",
      })
      .returning();
    assertNonNullish(row);
    return row.id;
  };

  describe("getMovement", () => {
    test("returns the movement matching the id", async () => {
      const movementId = await createMovement();

      const movement = await db.transaction((tx) => getMovement({ tx, id: movementId }));

      expect(movement.id).toBe(movementId);
      expect(movement.amount).toBe(1000n);
      expect(movement.status).toBe(BankMovementStatus.UNRECONCILED);
    });

    test("acquires the requested row lock without error", async () => {
      const movementId = await createMovement();

      const movement = await db.transaction((tx) =>
        getMovement({ tx, id: movementId, lock: "no key update" }),
      );

      expect(movement.id).toBe(movementId);
    });

    test("rejects when the id matches nothing", async () => {
      await expect(
        db.transaction((tx) => getMovement({ tx, id: TEST_MISSING_ID })),
      ).rejects.toThrow();
    });
  });

  describe("updateMovement", () => {
    test("applies the change and returns the movement", async () => {
      const movementId = await createMovement();

      const updated = await db.transaction((tx) =>
        updateMovement({ tx, movementId, values: { status: BankMovementStatus.IGNORED } }),
      );

      expect(updated.id).toBe(movementId);
      expect(updated.status).toBe(BankMovementStatus.IGNORED);
    });

    test("rejects reconciling a movement linked to no journal entry", async () => {
      const movementId = await createMovement();

      await expect(
        db.transaction((tx) =>
          updateMovement({ tx, movementId, values: { status: BankMovementStatus.RECONCILED } }),
        ),
      ).rejects.toThrow();
    });

    test("rejects when the id matches nothing", async () => {
      await expect(
        db.transaction((tx) =>
          updateMovement({
            tx,
            movementId: TEST_MISSING_ID,
            values: { status: BankMovementStatus.IGNORED },
          }),
        ),
      ).rejects.toThrow();
    });
  });
});

describe("listMovements", () => {
  let organizationId: string;
  let bankRelationId: string;
  let otherBankRelationId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    organizationId = await createOrganization(db, TEST_USER_ID);
    bankRelationId = await createBankRelation(db, organizationId);
    otherBankRelationId = await createBankRelation(db, organizationId, {
      iban: "CH5604835012345678009",
    });
  });

  afterAll(async () => {
    await resetDb(db);
  });

  const createMovement = async ({
    accountId = bankRelationId,
    bookedOn = new Date("2026-10-05"),
    status = BankMovementStatus.UNRECONCILED,
  }: {
    accountId?: string;
    bookedOn?: Date;
    status?: BankMovementStatus;
  }): Promise<string> => {
    const statementId = await createBankStatement(db, {
      organizationId,
      bankRelationId: accountId,
    });

    const [row] = await db
      .insert(movements)
      .values({
        organizationId,
        bankRelationId: accountId,
        statementId,
        bankReference: crypto.randomUUID(),
        dedupeHash: randomDedupeHash(),
        bookedOn,
        amount: 1000n,
        currency: "CHF",
        status,
      })
      .returning();
    assertNonNullish(row);
    return row.id;
  };

  const list = ({
    filters,
  }: {
    filters?: { status?: BankMovementStatus; bookedOnFrom?: Date; bookedOnTo?: Date };
  }) =>
    db.transaction((tx) =>
      listMovements({
        tx,
        bankRelationId,
        filters,
        orderBy: [asc(movements.createdAt)],
        pagination: { limit: 50, offset: 0 },
      }),
    );

  test("lists the movements of the bank relation only", async () => {
    const movementId = await createMovement({});
    const otherMovementId = await createMovement({ accountId: otherBankRelationId });

    const ids = (await list({})).map(({ id }) => id);

    expect(ids).toContain(movementId);
    expect(ids).not.toContain(otherMovementId);
  });

  test("applies the filters", async () => {
    const ignoredId = await createMovement({
      bookedOn: new Date("2026-11-20"),
      status: BankMovementStatus.IGNORED,
    });
    await createMovement({ bookedOn: new Date("2026-11-21") });

    const ids = (
      await list({
        filters: {
          status: BankMovementStatus.IGNORED,
          bookedOnFrom: new Date("2026-11-01"),
          bookedOnTo: new Date("2026-11-30"),
        },
      })
    ).map(({ id }) => id);

    expect(ids).toEqual([ignoredId]);
  });
});

afterAll(async () => {
  await client.close();
});
