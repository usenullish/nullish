import { test } from "@playwright/test";
import { initTestSuite } from "../_test-suite";
import { SubscriptionPage } from "../page-objects/subscription.page";
import { SubscriptionStatus } from "../../packages/schema/src/db/constants/subscriptions";

const getSubscriptionPage = initTestSuite(SubscriptionPage, { locale: "fr-CH" });

const email = `e2e-${crypto.randomUUID()}@example.com`;

test("signs up and creates an organization in trial", async () => {
  const subscriptionPage = getSubscriptionPage();

  await subscriptionPage.signUp({ name: "E2E User", email, password: "e2e-password" });

  await subscriptionPage.createOrganization({ name: "E2E Stripe" });

  await subscriptionPage.skipVat();

  await subscriptionPage.assertReady();

  await subscriptionPage.letsGo();
});

test("pays a plan on Stripe's checkout", async () => {
  const subscriptionPage = getSubscriptionPage();

  await subscriptionPage.choosePlan();

  await subscriptionPage.subscribe();

  await subscriptionPage.payOnStripe({
    card: {
      email,
      number: "4242 4242 4242 4242",
      expiry: "11 / 34",
      cvc: "111",
      name: "E2E User",
    },
  });
});

test("activates the subscription once Stripe confirms the payment", async () => {
  const subscriptionPage = getSubscriptionPage();

  await subscriptionPage.assertActivated();

  await subscriptionPage.continue();
});

test("shows the active subscription in the details", async () => {
  const subscriptionPage = getSubscriptionPage();

  await subscriptionPage.openSubscription();

  await subscriptionPage.assertStatus({ status: SubscriptionStatus.ACTIVE });
});

test("opens Stripe's portal to manage the subscription", async () => {
  const subscriptionPage = getSubscriptionPage();

  await subscriptionPage.manage();
});

test("cancels the subscription at the end of the period", async () => {
  const subscriptionPage = getSubscriptionPage();

  await subscriptionPage.cancelOnStripe();

  await subscriptionPage.assertCancelled();
});

test("renews a cancelled subscription", async () => {
  const subscriptionPage = getSubscriptionPage();

  await subscriptionPage.manage();

  await subscriptionPage.renewOnStripe();

  await subscriptionPage.assertRenewed();
});
