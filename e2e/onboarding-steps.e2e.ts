import { test } from "@playwright/test";
import { initTestSuite } from "./_test-suite";
import { OnboardingStepsPage } from "./page-objects/onboarding-steps.page";

const getOnboardingStepsPage = initTestSuite(OnboardingStepsPage);

const client = { name: "E2E Client" };

test("signs up and creates an organization without VAT", async () => {
  const onboardingStepsPage = getOnboardingStepsPage();

  await onboardingStepsPage.signUp({
    name: "E2E User",
    email: `e2e-${crypto.randomUUID()}@example.com`,
    password: "e2e-password",
  });

  await onboardingStepsPage.createOrganization({ name: "E2E Onboarding Organization" });

  await onboardingStepsPage.skipVat();

  await onboardingStepsPage.letsGo();

  await onboardingStepsPage.assertOnboardingVisible();

  onboardingStepsPage.rememberOrganization();
});

test("locks the invoice until a client exists", async () => {
  const onboardingStepsPage = getOnboardingStepsPage();

  await onboardingStepsPage.assertTasksOpen({ tasks: ["bankRelation", "client"] });
  await onboardingStepsPage.assertTasksClosed({ tasks: ["invoice"] });
});

test("adds a bank account", async () => {
  const onboardingStepsPage = getOnboardingStepsPage();

  await onboardingStepsPage.createBankRelation({
    name: "E2E Bank",
    iban: "CH3908704016075473007",
    accountCode: "1020",
  });

  await onboardingStepsPage.openHome();

  await onboardingStepsPage.assertTasksClosed({ tasks: ["bankRelation"] });
});

test("creates a first client", async () => {
  const onboardingStepsPage = getOnboardingStepsPage();

  await onboardingStepsPage.createClient(client);

  await onboardingStepsPage.openHome();

  await onboardingStepsPage.assertTasksClosed({ tasks: ["client"] });
  await onboardingStepsPage.assertTasksOpen({ tasks: ["invoice"] });
});

test("creates a first invoice", async () => {
  const onboardingStepsPage = getOnboardingStepsPage();

  await onboardingStepsPage.createInvoice({ clientName: client.name });
});

test("shows the chat once every step is done", async () => {
  const onboardingStepsPage = getOnboardingStepsPage();

  await onboardingStepsPage.openHome();

  await onboardingStepsPage.assertChatOnHome();
});
