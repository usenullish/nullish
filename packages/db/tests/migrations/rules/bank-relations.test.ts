import { afterAll, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { assertNonNullish } from "@usenullish/nullish-common";
import { AccountType } from "@usenullish/nullish-schema/db";
import { envDbUrl } from "@usenullish/nullish-env";
import {
  accounts,
  bankRelations,
  billingSettings,
  billingSettingsRow,
  causeMessage,
  createBankRelation,
  createOrganization,
  leafAccountId,
  resetDb,
  seedUsers,
} from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

describe("bank relations", () => {
  let organizationId: string;
  let assetAccountId: string;

  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await client.close();
  });

  beforeEach(async () => {
    organizationId = await createOrganization(db);
    assetAccountId = await leafAccountId(db, organizationId, AccountType.ASSET);
  });

  describe("check_bank_relation_ledger_account", () => {
    test("accepts an asset account of the organization without child accounts", async () => {
      const bankRelationId = await createBankRelation(db, organizationId, {
        accountId: assetAccountId,
      });

      const [row] = await db
        .select()
        .from(bankRelations)
        .where(eq(bankRelations.id, bankRelationId));

      expect(row?.accountId).toBe(assetAccountId);
    });

    test("rejects an account that is not an asset account", async () => {
      const expenseAccountId = await leafAccountId(db, organizationId, AccountType.EXPENSE);

      const error = await createBankRelation(db, organizationId, {
        accountId: expenseAccountId,
      }).catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("is not an asset account of the organization");
    });

    test("rejects an account of another organization", async () => {
      const otherOrganizationId = await createOrganization(db);
      const otherAccountId = await leafAccountId(db, otherOrganizationId, AccountType.ASSET);

      const error = await createBankRelation(db, organizationId, {
        accountId: otherAccountId,
      }).catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("is not an asset account of the organization");
    });

    test("rejects an account that has child accounts", async () => {
      const [leaf] = await db.select().from(accounts).where(eq(accounts.id, assetAccountId));
      assertNonNullish(leaf?.parentId);

      const error = await createBankRelation(db, organizationId, {
        accountId: leaf.parentId,
      }).catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("has child accounts");
    });

    test("rejects changing the ledger account to one that is not an asset account", async () => {
      const bankRelationId = await createBankRelation(db, organizationId, {
        accountId: assetAccountId,
      });
      const expenseAccountId = await leafAccountId(db, organizationId, AccountType.EXPENSE);

      const error = await db
        .update(bankRelations)
        .set({ accountId: expenseAccountId })
        .where(eq(bankRelations.id, bankRelationId))
        .catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("is not an asset account of the organization");
    });
  });

  describe("constraints", () => {
    test("rejects an IBAN with spaces or lowercase letters", async () => {
      const error = await createBankRelation(db, organizationId, {
        accountId: assetAccountId,
        iban: "ch93 0076 2011 6238 5295 7",
      }).catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("bank_relations_iban_format");
    });

    test("rejects the same IBAN twice in an organization", async () => {
      await createBankRelation(db, organizationId, { accountId: assetAccountId });

      const error = await createBankRelation(db, organizationId, {
        accountId: assetAccountId,
      }).catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("bank_relations_org_iban_uidx");
    });

    test("accepts the same IBAN in two organizations", async () => {
      const otherOrganizationId = await createOrganization(db);
      const otherAccountId = await leafAccountId(db, otherOrganizationId, AccountType.ASSET);

      await createBankRelation(db, organizationId, { accountId: assetAccountId });
      const otherBankRelationId = await createBankRelation(db, otherOrganizationId, {
        accountId: otherAccountId,
      });

      const [row] = await db
        .select()
        .from(bankRelations)
        .where(eq(bankRelations.id, otherBankRelationId));

      expect(row?.organizationId).toBe(otherOrganizationId);
    });

    test("accepts an invoice IBAN along with the IBAN", async () => {
      const bankRelationId = await createBankRelation(db, organizationId, {
        accountId: assetAccountId,
        invoiceIban: "CH4431999123000889012",
      });

      const [row] = await db
        .select()
        .from(bankRelations)
        .where(eq(bankRelations.id, bankRelationId));

      expect(row?.invoiceIban).toBe("CH4431999123000889012");
    });

    test("rejects an invoice IBAN with spaces or lowercase letters", async () => {
      const error = await createBankRelation(db, organizationId, {
        accountId: assetAccountId,
        invoiceIban: "ch44 3199 9123 0008 8901 2",
      }).catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("bank_relations_invoice_iban_format");
    });

    test("rejects the same invoice IBAN twice in an organization", async () => {
      await createBankRelation(db, organizationId, {
        accountId: assetAccountId,
        invoiceIban: "CH4431999123000889012",
      });

      const error = await createBankRelation(db, organizationId, {
        accountId: assetAccountId,
        iban: "CH5604835012345678009",
        invoiceIban: "CH4431999123000889012",
      }).catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("bank_relations_org_invoice_iban_uidx");
    });
  });

  describe("check_organization_immutable", () => {
    test("rejects changing organization_id once set", async () => {
      const bankRelationId = await createBankRelation(db, organizationId, {
        accountId: assetAccountId,
      });
      const otherOrganizationId = await createOrganization(db);

      const error = await db
        .update(bankRelations)
        .set({ organizationId: otherOrganizationId })
        .where(eq(bankRelations.id, bankRelationId))
        .catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("organization_id cannot be changed once set");
    });
  });

  describe("check_billing_settings_bank_relation", () => {
    test("accepts a bank relation of the organization as default", async () => {
      const bankRelationId = await createBankRelation(db, organizationId, {
        accountId: assetAccountId,
      });
      const settings = await billingSettingsRow(db, organizationId);

      const [updated] = await db
        .update(billingSettings)
        .set({ bankRelationId })
        .where(eq(billingSettings.id, settings.id))
        .returning();

      expect(updated?.bankRelationId).toBe(bankRelationId);
    });

    test("rejects a bank relation of another organization as default", async () => {
      const otherOrganizationId = await createOrganization(db);
      const otherAccountId = await leafAccountId(db, otherOrganizationId, AccountType.ASSET);
      const otherBankRelationId = await createBankRelation(db, otherOrganizationId, {
        accountId: otherAccountId,
      });
      const settings = await billingSettingsRow(db, organizationId);

      const error = await db
        .update(billingSettings)
        .set({ bankRelationId: otherBankRelationId })
        .where(eq(billingSettings.id, settings.id))
        .catch((e: unknown) => e);

      expect(causeMessage(error)).toContain("does not belong to the organization");
    });

    test("allows clearing the default bank relation", async () => {
      const bankRelationId = await createBankRelation(db, organizationId, {
        accountId: assetAccountId,
      });
      const settings = await billingSettingsRow(db, organizationId);

      await db
        .update(billingSettings)
        .set({ bankRelationId })
        .where(eq(billingSettings.id, settings.id));

      const [updated] = await db
        .update(billingSettings)
        .set({ bankRelationId: null })
        .where(eq(billingSettings.id, settings.id))
        .returning();

      expect(updated?.bankRelationId).toBeNull();
    });
  });
});
