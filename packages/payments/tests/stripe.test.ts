import { afterEach, beforeEach, describe, expect, spyOn, test } from "bun:test";
import Stripe from "stripe";
import { SubscriptionProvider, SubscriptionStatus } from "@usenullish/nullish-schema/db";
import { StripePaymentProvider } from "../src/_stripe";

const WEBHOOK_SECRET = "whsec_test";
const ORGANIZATION_ID = "018f4a2e-7c1b-4d3a-9e5f-2b6c8d0e1f3a";
const PERIOD_START = 1_796_083_200;
const PERIOD_END = 1_798_761_600;

const subscriptionOf = ({ status }: { status: Stripe.Subscription.Status }) => ({
  id: "sub_123",
  object: "subscription",
  customer: "cus_456",
  status,
  items: {
    object: "list",
    data: [
      {
        id: "si_1",
        object: "subscription_item",
        current_period_start: PERIOD_START,
        current_period_end: PERIOD_END,
        price: { id: "price_1", object: "price", product: "prod_10users" },
      },
    ],
  },
});

const payloadOf = ({ type, object }: { type: string; object: unknown }): string =>
  JSON.stringify({ id: "evt_1", object: "event", type, data: { object } });

describe("StripePaymentProvider", () => {
  const KEYS = ["NULLISH_STRIPE_SECRET_KEY", "NULLISH_STRIPE_WEBHOOK_SECRET"] as const;

  const saved = new Map<string, string | undefined>();

  let fetchSpy: ReturnType<typeof spyOn<typeof globalThis, "fetch">>;

  const mockSubscription = (subscription: ReturnType<typeof subscriptionOf>) => {
    fetchSpy.mockImplementation((async () =>
      Response.json(subscription)) as unknown as typeof fetch);
  };

  const handle = async (payload: string) => {
    const signature = await Stripe.webhooks.generateTestHeaderStringAsync({
      payload,
      secret: WEBHOOK_SECRET,
    });

    return StripePaymentProvider.create().handle({ payload, signature });
  };

  const subscriptionUpdated = payloadOf({
    type: "customer.subscription.updated",
    object: { id: "sub_123", object: "subscription" },
  });

  beforeEach(() => {
    for (const key of KEYS) {
      saved.set(key, process.env[key]);
    }

    process.env.NULLISH_STRIPE_SECRET_KEY = "sk_test_123";
    process.env.NULLISH_STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;

    fetchSpy = spyOn(globalThis, "fetch");
    mockSubscription(subscriptionOf({ status: "active" }));
  });

  afterEach(() => {
    fetchSpy.mockRestore();

    for (const key of KEYS) {
      const value = saved.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  test("rejects an invalid signature", async () => {
    const provider = StripePaymentProvider.create();

    expect(
      provider.handle({ payload: subscriptionUpdated, signature: "t=1,v1=invalid" }),
    ).rejects.toThrow();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("ignores an event that does not concern a subscription", async () => {
    const result = await handle(payloadOf({ type: "customer.created", object: { id: "cus_456" } }));

    expect(result).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("ignores a checkout without subscription", async () => {
    const result = await handle(
      payloadOf({
        type: "checkout.session.completed",
        object: { id: "cs_1", subscription: null, client_reference_id: ORGANIZATION_ID },
      }),
    );

    expect(result).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("returns the organization of a completed checkout", async () => {
    const result = await handle(
      payloadOf({
        type: "checkout.session.completed",
        object: { id: "cs_1", subscription: "sub_123", client_reference_id: ORGANIZATION_ID },
      }),
    );

    expect(result).toEqual({
      organizationId: ORGANIZATION_ID,
      provider: SubscriptionProvider.STRIPE,
      externalCustomerId: "cus_456",
      externalSubscriptionId: "sub_123",
      externalProductId: "prod_10users",
      status: SubscriptionStatus.ACTIVE,
      periodEnd: new Date(PERIOD_END * 1000),
    });
  });

  test("rejects a checkout with an invalid organization", async () => {
    const payload = payloadOf({
      type: "checkout.session.completed",
      object: { id: "cs_1", subscription: "sub_123", client_reference_id: "not-an-organization" },
    });

    expect(handle(payload)).rejects.toThrow();
  });

  test("returns no organization for a subscription event", async () => {
    const result = await handle(subscriptionUpdated);

    expect(result?.organizationId).toBeUndefined();
    expect(result?.externalSubscriptionId).toBe("sub_123");
  });

  test("reads the subscription of a failed invoice", async () => {
    mockSubscription(subscriptionOf({ status: "past_due" }));

    const result = await handle(
      payloadOf({
        type: "invoice.payment_failed",
        object: {
          id: "in_1",
          parent: { subscription_details: { subscription: "sub_123" } },
        },
      }),
    );

    expect(result?.status).toBe(SubscriptionStatus.PAST_DUE);
  });

  test("ignores an invoice without subscription", async () => {
    const result = await handle(
      payloadOf({ type: "invoice.payment_failed", object: { id: "in_1", parent: null } }),
    );

    expect(result).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test.each([
    ["trialing", SubscriptionStatus.TRIALING, new Date(PERIOD_END * 1000)],
    ["active", SubscriptionStatus.ACTIVE, new Date(PERIOD_END * 1000)],
    ["past_due", SubscriptionStatus.PAST_DUE, new Date(PERIOD_START * 1000)],
    ["canceled", SubscriptionStatus.INACTIVE, undefined],
    ["unpaid", SubscriptionStatus.INACTIVE, undefined],
    ["paused", SubscriptionStatus.INACTIVE, undefined],
    ["incomplete_expired", SubscriptionStatus.INACTIVE, undefined],
  ] as const)("maps the status %s", async (status, expected, periodEnd) => {
    mockSubscription(subscriptionOf({ status }));

    const result = await handle(subscriptionUpdated);

    expect(result?.status).toBe(expected);
    expect(result?.periodEnd).toEqual(periodEnd);
  });

  test("ignores an incomplete subscription", async () => {
    mockSubscription(subscriptionOf({ status: "incomplete" }));

    expect(await handle(subscriptionUpdated)).toBeUndefined();
  });
});
