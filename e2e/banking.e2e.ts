import { test } from "@playwright/test";
import { initTestSuite } from "./_test-suite";
import { BankingPage } from "./page-objects/banking.page";

const getBankingPage = initTestSuite(BankingPage);

test("signs up and creates an organization", async () => {
  const bankingPage = getBankingPage();

  await bankingPage.signUp({
    name: "E2E User",
    email: `e2e-${crypto.randomUUID()}@example.com`,
    password: "e2e-password",
  });

  await bankingPage.createOrganization({ name: "E2E Banking Organization" });

  await bankingPage.skipVat();

  await bankingPage.letsGo();

  await bankingPage.assertOnboardingVisible();
});

test("adds a bank account", async () => {
  const bankingPage = getBankingPage();

  await bankingPage.createBankRelation({
    name: "E2E Bank",
    iban: "CH3908704016075473007",
    accountCode: "1020",
  });
});

test("imports a camt.053 statement", async () => {
  const bankingPage = getBankingPage();

  await bankingPage.importStatement({ file: "statement.camt053.xml" });
});

test("shows the imported movement to reconcile", async () => {
  const bankingPage = getBankingPage();

  await bankingPage.assertMovementToReconcile({ bankReference: "20261031000456" });
});
