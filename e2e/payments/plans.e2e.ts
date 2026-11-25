import { test } from "@playwright/test";
import { initTestSuite } from "../_test-suite";
import { PaymentsSubscriptionPage } from "../page-objects/payments-subscription.page";
import {
  BillingPeriod,
  SubscriptionStatus,
} from "../../packages/schema/src/db/constants/subscriptions";
import {
  VatPaymentMethod,
  VatRemunerationMethod,
} from "../../packages/schema/src/db/constants/vat";

const getSubscriptionPage = initTestSuite(PaymentsSubscriptionPage);

test("signs up and creates an organization in trial", async () => {
  const subscriptionPage = getSubscriptionPage();

  await subscriptionPage.signUp({
    name: "E2E User",
    email: `e2e-${crypto.randomUUID()}@example.com`,
    password: "e2e-password",
  });

  await subscriptionPage.createOrganization({ name: "E2E Subscription" });

  await subscriptionPage.setupVat({
    vatNumber: "CHE-123.456.789 MWST",
    paymentMethod: VatPaymentMethod.NET_RATE,
    remunerationMethod: VatRemunerationMethod.AGREED,
  });

  await subscriptionPage.letsGo();
});

test("shows the trial in the subscription details", async () => {
  const subscriptionPage = getSubscriptionPage();

  await subscriptionPage.openSubscription();

  await subscriptionPage.assertStatus({ status: SubscriptionStatus.TRIALING });
});

test("opens the plans from the trial banner", async () => {
  const subscriptionPage = getSubscriptionPage();

  await subscriptionPage.choosePlan();

  await subscriptionPage.assertCustomPlansVisible();
});

test("shows only the plans with a yearly price by default", async () => {
  const subscriptionPage = getSubscriptionPage();

  await subscriptionPage.assertPlanHidden();
  await subscriptionPage.assertCustomPlansVisible();
});

test("shows the plans with a monthly price", async () => {
  const subscriptionPage = getSubscriptionPage();

  await subscriptionPage.selectBilling({ billingPeriod: BillingPeriod.MONTH });

  await subscriptionPage.assertPlanVisible();
  await subscriptionPage.assertCustomPlansVisible();
});

test("links the custom plans to their contact page in the language of the user", async () => {
  const subscriptionPage = getSubscriptionPage();

  await subscriptionPage.assertContactUrls({
    requestInstance: "https://nullish.ch/en/contact/instance",
    getInTouch: "https://nullish.ch/en/contact/on-prem",
  });
});

test("redirects to the checkout of the provider", async () => {
  const subscriptionPage = getSubscriptionPage();

  await subscriptionPage.subscribe();

  await subscriptionPage.assertCheckoutOpened();
});

test("returns to the plans with the selected billing when leaving the checkout", async () => {
  const subscriptionPage = getSubscriptionPage();

  await subscriptionPage.cancelCheckout();

  await subscriptionPage.assertBilling({ billingPeriod: BillingPeriod.MONTH });
  await subscriptionPage.assertSubscribeEnabled();
});

test("waits for the activation after the payment", async () => {
  const subscriptionPage = getSubscriptionPage();

  await subscriptionPage.openSuccess();

  await subscriptionPage.assertActivating();
});

test("tells when the activation takes longer", async () => {
  const subscriptionPage = getSubscriptionPage();

  await subscriptionPage.assertActivationTimedOut();

  await subscriptionPage.backToOrganization();
});
