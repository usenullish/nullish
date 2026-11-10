import { test } from "@playwright/test";
import { initTestSuite } from "./_test-suite";
import { OnboardingPage } from "./page-objects/onboarding.page";
import { VatPaymentMethod, VatRemunerationMethod } from "../packages/schema/src/db/constants/vat";

const getOnboardingPage = initTestSuite(OnboardingPage);

const organization = { name: "E2E Organization" };

test("signs up a new user", async () => {
  const onboardingPage = getOnboardingPage();

  await onboardingPage.signUp({
    name: "E2E User",
    email: `e2e-${crypto.randomUUID()}@example.com`,
    password: "e2e-password",
  });

  await onboardingPage.assertNewOrganizationVisible();
});

test("creates an organization", async () => {
  const onboardingPage = getOnboardingPage();

  await onboardingPage.createOrganization(organization);
});

test("sets up the VAT with the net rate method", async () => {
  const onboardingPage = getOnboardingPage();

  await onboardingPage.setupVat({
    vatNumber: "CHE-123.456.789 MWST",
    paymentMethod: VatPaymentMethod.NET_RATE,
    remunerationMethod: VatRemunerationMethod.AGREED,
  });

  await onboardingPage.assertReady();
});

test("opens the chat of the organization", async () => {
  const onboardingPage = getOnboardingPage();

  await onboardingPage.letsGo();

  await onboardingPage.assertChatVisible();
});
