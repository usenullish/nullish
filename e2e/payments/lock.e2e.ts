import { test } from "@playwright/test";
import { initTestSuite } from "../_test-suite";
import { SubscriptionLockPage } from "../page-objects/subscription-lock.page";
import { PAYMENTS_SEED } from "../seed/payments.seed.constants";

const getSubscriptionLockPage = initTestSuite(SubscriptionLockPage);

test("signs in the seeded user", async () => {
  const subscriptionLockPage = getSubscriptionLockPage();

  const { email, password } = PAYMENTS_SEED.user;

  await subscriptionLockPage.signIn({ email, password });

  await subscriptionLockPage.assertSignedIn();
});

test("locks an organization whose trial has ended", async () => {
  const subscriptionLockPage = getSubscriptionLockPage();

  await subscriptionLockPage.openOrganization(PAYMENTS_SEED.organizations.expiredTrial);

  await subscriptionLockPage.assertLocked();
});

test("goes back to the organizations from the lock", async () => {
  const subscriptionLockPage = getSubscriptionLockPage();

  await subscriptionLockPage.backToOrganizations();
});

test("warns about a missed payment before the lock", async () => {
  const subscriptionLockPage = getSubscriptionLockPage();

  await subscriptionLockPage.openOrganization(PAYMENTS_SEED.organizations.pastDue);

  await subscriptionLockPage.assertGraceBannerVisible();
});
