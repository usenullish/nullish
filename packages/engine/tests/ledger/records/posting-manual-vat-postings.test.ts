import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { SQL as BunSQL } from "bun";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  DbSchema,
  EXCHANGE_RATE_ONE,
  SystemAccountPurpose,
  VatPaymentMethod,
  VatRemunerationMethod,
} from "@usenullish/nullish-schema/db";
import { DbCollectionPostingManualVatPostings } from "../../../src/ledger/records/posting-manual-vat-postings";
import { CreateJournalService } from "../../../src/ledger/services/journal/journal.create";
import { EngineError } from "../../../src/errors";
import {
  createOrganization,
  createVatSettings,
  resetDb,
  seedUsers,
  systemAccountIdByPurpose,
  TEST_OTHER_USER_ID,
  TEST_USER_ID,
  vatRateIdByCode,
} from "../../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const periods = DbSchema.Ledger.Periods.PeriodsSchema;
const vatLinks = DbSchema.Ledger.PostingManualVatPostings.PostingManualVatPostingsSchema;

const LIST_QUERY = {
  pagination: { limit: 100, offset: 0 },
  sort: { field: "createdAt" as const, direction: "asc" as const },
};

const seed = async ({
  organizationId,
  userId,
}: {
  organizationId: string;
  userId: typeof TEST_USER_ID | typeof TEST_OTHER_USER_ID;
}): Promise<string[]> => {
  await db.insert(periods).values({
    organizationId,
    startOn: new Date("2026-01-01"),
    endOn: new Date("2026-12-31"),
  });

  await createVatSettings(db, {
    organizationId,
    remunerationMethod: VatRemunerationMethod.AGREED,
    paymentMethod: VatPaymentMethod.EFFECTIVE,
  });

  const expenseId = await systemAccountIdByPurpose(db, {
    organizationId,
    purpose: SystemAccountPurpose.DEFAULT_EXPENSE,
  });
  const bankId = await systemAccountIdByPurpose(db, {
    organizationId,
    purpose: SystemAccountPurpose.BANK_ACCOUNT,
  });
  const vatRateId = await vatRateIdByCode(db, { organizationId, code: "VM81" });

  const result = await CreateJournalService.create({ db, userId, organizationId }).create({
    values: {
      entry: { validOn: new Date("2026-06-15"), reference: "PURCHASE" },
      postings: [
        {
          accountId: expenseId,
          description: "Purchase",
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
          vatRateId,
          debit: 10810n,
          credit: 0n,
        },
        {
          accountId: bankId,
          description: "Purchase",
          currency: "CHF",
          exchangeRate: EXCHANGE_RATE_ONE,
          vatRateId: null,
          debit: 0n,
          credit: 10810n,
        },
      ],
    },
  });

  if (result.status === "error") {
    throw result.err;
  }

  const links = await db
    .select({ id: vatLinks.id })
    .from(vatLinks)
    .where(eq(vatLinks.organizationId, organizationId));

  return links.map(({ id }) => id);
};

describe("posting manual VAT postings", () => {
  let orgId: string;
  let otherOrgId: string;
  let ids: string[];

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);

    orgId = await createOrganization(db, TEST_USER_ID);
    otherOrgId = await createOrganization(db, TEST_OTHER_USER_ID);

    ids = await seed({ organizationId: orgId, userId: TEST_USER_ID });
    await seed({ organizationId: otherOrgId, userId: TEST_OTHER_USER_ID });
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  describe("list", () => {
    test("returns only the manual VAT postings of the organization", async () => {
      const result = await DbCollectionPostingManualVatPostings.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: orgId,
      }).list(LIST_QUERY);

      if (result.status === "error") {
        expect(true).toBeFalse();
        return;
      }

      expect(ids).not.toBeEmpty();
      expect(result.result.data.map(({ id }) => id).sort()).toEqual([...ids].sort());
    });

    test("returns no manual VAT postings of an organization the user is not a member of", async () => {
      const result = await DbCollectionPostingManualVatPostings.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: otherOrgId,
      }).list(LIST_QUERY);

      expect(result).toEqual({ status: "success", result: { data: [] } });
    });
  });

  describe("insert", () => {
    test("is not supported", async () => {
      const result = await DbCollectionPostingManualVatPostings.create({
        db,
        userId: TEST_USER_ID,
        foreignKeyId: orgId,
      }).insert({
        values: {
          organizationId: orgId,
          postingId: crypto.randomUUID(),
          vatPostingId: crypto.randomUUID(),
        },
      });

      if (result.status === "success") {
        expect(true).toBeFalse();
        return;
      }

      expect(result.err).toBeInstanceOf(EngineError);
    });
  });
});
