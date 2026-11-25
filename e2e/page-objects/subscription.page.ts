import { expect } from "@playwright/test";
import { assertNonNullish } from "../../packages/common/src/asserts/nullish";
import { OnboardingPage } from "./onboarding.page";
import { SignUpWithoutVerificationPage } from "./sign-up-without-verification.page";
import { testIds } from "../../packages/client/app/kit/tests/test-ids.constants";
import type {
  BillingPeriod,
  SubscriptionStatus,
} from "../../packages/schema/src/db/constants/subscriptions";
import {
  SUBSCRIPTION_BILLING_PARAM,
  SUBSCRIPTION_SUCCESS_PATH,
} from "../../packages/schema/src/server/constants/paths";

const STRIPE_CHECKOUT_URL = "https://checkout.stripe.com/**";

export class SubscriptionPage extends OnboardingPage {
  override async signUp(user: { name: string; email: string; password: string }): Promise<void> {
    const { page, context } = this;

    await new SignUpWithoutVerificationPage({ page, context }).signUp(user);
  }

  async openSubscription(): Promise<void> {
    await this.click(`${testIds.navigation.organization}-subscription`);

    await expect(this.page).toHaveURL(/\/orgs\/[^/]+\/subscription\/details$/);
  }

  async assertStatus({ status }: { status: SubscriptionStatus }): Promise<void> {
    await expect(this.page.getByTestId(`${testIds.subscription.status}-${status}`)).toBeVisible();
    await expect(this.page.getByTestId(testIds.subscription.periodEnd)).toBeVisible();
  }

  async choosePlan(): Promise<void> {
    await this.click(testIds.subscription.choosePlan);

    await expect(this.page).toHaveURL(/\/orgs\/[^/]+\/subscription\/plans/);
  }

  async selectBilling({ billingPeriod }: { billingPeriod: BillingPeriod }): Promise<void> {
    await this.click(`${testIds.subscription.billing}-${billingPeriod}`);

    await this.assertBilling({ billingPeriod });
  }

  async assertBilling({ billingPeriod }: { billingPeriod: BillingPeriod }): Promise<void> {
    await expect(this.page).toHaveURL(new RegExp(`${SUBSCRIPTION_BILLING_PARAM}=${billingPeriod}`));
  }

  async assertPlanVisible(): Promise<void> {
    await expect(this.page.getByTestId(testIds.subscription.plan)).toBeVisible();
  }

  async assertPlanHidden(): Promise<void> {
    await expect(this.page.getByTestId(testIds.subscription.plan)).toHaveCount(0);
  }

  async assertCustomPlansVisible(): Promise<void> {
    await expect(this.page.getByTestId(testIds.subscription.instance)).toBeVisible();
    await expect(this.page.getByTestId(testIds.subscription.onPrem)).toBeVisible();
  }

  async assertContactUrls({
    requestInstance,
    getInTouch,
  }: {
    requestInstance: string;
    getInTouch: string;
  }): Promise<void> {
    await expect(this.page.getByTestId(testIds.subscription.requestInstance)).toHaveAttribute(
      "href",
      requestInstance,
    );
    await expect(this.page.getByTestId(testIds.subscription.getInTouch)).toHaveAttribute(
      "href",
      getInTouch,
    );
  }

  async subscribe(): Promise<void> {
    await this.page.route(STRIPE_CHECKOUT_URL, (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<p>Checkout</p>" }),
    );

    await this.click(testIds.subscription.subscribe);
  }

  async assertCheckoutOpened(): Promise<void> {
    await expect(this.page).toHaveURL(/^https:\/\/checkout\.stripe\.com\//);
  }

  async cancelCheckout(): Promise<void> {
    await this.page.goBack();

    await expect(this.page).toHaveURL(/\/orgs\/[^/]+\/subscription\/plans/);
  }

  async assertSubscribeEnabled(): Promise<void> {
    await expect(this.page.getByTestId(testIds.subscription.subscribe)).toBeEnabled();
  }

  async openSuccess(): Promise<void> {
    const organizationId = this.#organizationId();

    await this.page.clock.install();

    await this.page.goto(`/orgs/${organizationId}${SUBSCRIPTION_SUCCESS_PATH}`);
  }

  async assertActivating(): Promise<void> {
    await expect(this.page.getByTestId(testIds.subscription.activating)).toBeVisible();
  }

  async assertActivationTimedOut(): Promise<void> {
    await expect(async () => {
      await this.page.clock.fastForward(2000);

      await expect(this.page.getByTestId(testIds.subscription.timeout)).toBeVisible({
        timeout: 100,
      });
    }).toPass({ intervals: [100], timeout: 25_000 });
  }

  async backToOrganization(): Promise<void> {
    await this.click(testIds.subscription.backToOrganization);

    await expect(this.page).toHaveURL(/\/orgs\/[^/]+$/);
  }

  #organizationId(): string {
    const [, organizationId] = /\/orgs\/([^/?]+)/.exec(this.page.url()) ?? [];

    assertNonNullish(organizationId);

    return organizationId;
  }
}
