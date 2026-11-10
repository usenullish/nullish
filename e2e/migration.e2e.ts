import { test } from "@playwright/test";
import { initTestSuite } from "./_test-suite";
import { MigrationPage } from "./page-objects/migration.page";
import { VatPaymentMethod, VatRemunerationMethod } from "../packages/schema/src/db/constants/vat";
import { MigrationDatasetType } from "../packages/schema/src/db/constants/migrations";

const getMigrationPage = initTestSuite(MigrationPage);

test("onboards a new user with an organization subject to VAT", async () => {
  const migrationPage = getMigrationPage();

  await migrationPage.signUp({
    name: "E2E User",
    email: `e2e-${crypto.randomUUID()}@example.com`,
    password: "e2e-password",
  });

  await migrationPage.createOrganization({ name: "E2E Migrated Organization" });

  await migrationPage.setupVat({
    vatNumber: "CHE-123.456.789 MWST",
    paymentMethod: VatPaymentMethod.NET_RATE,
    remunerationMethod: VatRemunerationMethod.AGREED,
  });

  await migrationPage.letsGo();

  await migrationPage.assertChatVisible();
});

test("creates the net rate tax booked by the journal", async () => {
  const migrationPage = getMigrationPage();

  await migrationPage.createNetRateTax({
    code: "UN81",
    rate: "8.1",
    netRate: "6.2",
    startOn: "2024-01-01",
  });
});

test("starts a migration from Bexio", async () => {
  const migrationPage = getMigrationPage();

  await migrationPage.startMigration();
});

test("uploads the Bexio exports", async () => {
  const migrationPage = getMigrationPage();

  await migrationPage.uploadDataset({ type: MigrationDatasetType.ACCOUNTS, file: "accounts.xlsx" });
  await migrationPage.uploadDataset({
    type: MigrationDatasetType.BALANCES,
    file: "balances.xlsx",
    validOn: "2026-01-01",
  });
  await migrationPage.uploadDataset({ type: MigrationDatasetType.CLIENTS, file: "clients.csv" });
  await migrationPage.uploadDataset({ type: MigrationDatasetType.JOURNAL, file: "journal.xlsx" });
  await migrationPage.uploadDataset({ type: MigrationDatasetType.INVOICES, file: "invoices.xlsx" });
});

test("runs the migration", async () => {
  const migrationPage = getMigrationPage();

  await migrationPage.runMigration();
});
