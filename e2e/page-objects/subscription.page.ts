import { expect } from "@playwright/test";
import { assertNonNullish } from "../../packages/common/src/asserts/nullish";
import { OnboardingPage } from "./onboarding.page";
import { SignUpWithoutVerificationPage } from "./sign-up-without-verification.page";
import {
  assertStripePortal,
  cancelOnStripe,
  leaveStripePortal,
  payOnStripe,
  renewOnStripe,
} from "../stripe-objects/stripe";
import { testIds } from "../../packages/client/app/kit/tests/test-ids.constants";
import type {
  BillingPeriod,
  SubscriptionStatus,
} from "../../packages/schema/src/db/constants/subscriptions";
import {
  SUBSCRIPTION_BILLING_PARAM,
  SUBSCRIPTION_SUCCESS_PATH,
} from "../../packages/schema/src/server/constants/paths";

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

  async manage(): Promise<void> {
    await this.click(testIds.subscription.manage);

    await assertStripePortal({ page: this.page });
  }

  async cancelOnStripe(): Promise<void> {
    await cancelOnStripe({ page: this.page });

    await leaveStripePortal({ page: this.page });
  }

  async renewOnStripe(): Promise<void> {
    await renewOnStripe({ page: this.page });

    await leaveStripePortal({ page: this.page });
  }

  async assertCancelled(): Promise<void> {
    await expect(this.page).toHaveURL(/\/orgs\/[^/]+\/subscription\/details$/);

    await expect(async () => {
      await this.page.reload();

      await expect(this.page.getByTestId(testIds.subscription.endsOn)).toBeVisible({
        timeout: 2_000,
      });
    }).toPass({ timeout: 60_000 });
  }

  async assertRenewed(): Promise<void> {
    await expect(this.page).toHaveURL(/\/orgs\/[^/]+\/subscription\/details$/);

    await expect(async () => {
      await this.page.reload();

      await expect(this.page.getByTestId(testIds.subscription.periodEnd)).toBeVisible({
        timeout: 2_000,
      });
    }).toPass({ timeout: 60_000 });

    await expect(this.page.getByTestId(testIds.subscription.endsOn)).toHaveCount(0);
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
    await this.click(testIds.subscription.subscribe);
  }

  async payOnStripe({ card }: Pick<Parameters<typeof payOnStripe>[0], "card">): Promise<void> {
    await payOnStripe({ page: this.page, card });
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

  async assertActivated(): Promise<void> {
    await expect(this.page.getByTestId(testIds.subscription.activated)).toBeVisible({
      timeout: 60_000,
    });
  }

  async continue(): Promise<void> {
    await this.click(testIds.subscription.continue);

    await expect(this.page).toHaveURL(/\/orgs\/[^/]+$/);
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
