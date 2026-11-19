import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from "bun:test";
import Stripe from "stripe";
import { SubscriptionProvider, SubscriptionStatus } from "@usenullish/nullish-schema/db";

const withDbContext = mock(async () => ({ status: "success", result: undefined }));

mock.module("../src/_db", () => ({ withDbContext }));

const { StripePaymentProvider } = await import("../src/_stripe");

const WEBHOOK_SECRET = "whsec_test";
const ORGANIZATION_ID = "018f4a2e-7c1b-4d3a-9e5f-2b6c8d0e1f3a";
const PERIOD_START = 1_796_083_200;
const PERIOD_END = 1_798_761_600;

const subscriptionOf = ({
  status,
  metadata = { organizationId: ORGANIZATION_ID },
}: {
  status: Stripe.Subscription.Status;
  metadata?: Record<string, string>;
}) => ({
  id: "sub_123",
  object: "subscription",
  customer: "cus_456",
  status,
  metadata,
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

    withDbContext.mockClear();

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
        object: { id: "cs_1", subscription: null },
      }),
    );

    expect(result).toBeUndefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  test("returns the organization of the subscription", async () => {
    const result = await handle(
      payloadOf({
        type: "checkout.session.completed",
        object: { id: "cs_1", subscription: "sub_123" },
      }),
    );

    expect(result).toEqual({
      organizationId: ORGANIZATION_ID,
      provider: SubscriptionProvider.STRIPE,
      externalIds: {
        subscriptionId: "sub_123",
        customerId: "cus_456",
        productId: "prod_10users",
      },
      status: SubscriptionStatus.ACTIVE,
      periodEnd: new Date(PERIOD_END * 1000),
    });
  });

  test("ignores the client reference of a checkout", async () => {
    const result = await handle(
      payloadOf({
        type: "checkout.session.completed",
        object: {
          id: "cs_1",
          subscription: "sub_123",
          client_reference_id: "11111111-1111-4111-8111-111111111111",
        },
      }),
    );

    expect(result?.organizationId).toBe(ORGANIZATION_ID);
  });

  test("returns the organization for every subscription event", async () => {
    const result = await handle(subscriptionUpdated);

    expect(result?.organizationId).toBe(ORGANIZATION_ID);
    expect(result?.externalIds.subscriptionId).toBe("sub_123");
  });

  test("ignores a subscription without organization", async () => {
    mockSubscription(subscriptionOf({ status: "active", metadata: {} }));

    expect(await handle(subscriptionUpdated)).toBeUndefined();
    expect(withDbContext).not.toHaveBeenCalled();
  });

  test("ignores a subscription with an invalid organization", async () => {
    mockSubscription(
      subscriptionOf({ status: "active", metadata: { organizationId: "not-an-organization" } }),
    );

    expect(await handle(subscriptionUpdated)).toBeUndefined();
    expect(withDbContext).not.toHaveBeenCalled();
  });

  test("accepts other metadata next to the organization", async () => {
    mockSubscription(
      subscriptionOf({
        status: "active",
        metadata: { organizationId: ORGANIZATION_ID, campaign: "launch" },
      }),
    );

    const result = await handle(subscriptionUpdated);

    expect(result?.organizationId).toBe(ORGANIZATION_ID);
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

  test("throws when the subscription cannot be synced", async () => {
    const err = new Error("Cannot sync");

    withDbContext.mockImplementationOnce(
      async () =>
        ({ status: "error", err }) as unknown as Awaited<ReturnType<typeof withDbContext>>,
    );

    await expect(handle(subscriptionUpdated)).rejects.toThrow(err);
  });

  test("ignores an incomplete subscription", async () => {
    mockSubscription(subscriptionOf({ status: "incomplete" }));

    expect(await handle(subscriptionUpdated)).toBeUndefined();
  });

  describe("checkout", () => {
    const CHECKOUT_URL = "https://checkout.stripe.com/c/pay/cs_1";

    const args = {
      organizationId: ORGANIZATION_ID,
      priceId: "price_1",
      successUrl: "https://app.nullish.test/orgs/success",
      cancelUrl: "https://app.nullish.test/orgs/cancel",
    };

    const mockCheckout = ({ url }: { url: string | null }) => {
      fetchSpy.mockImplementation((async () =>
        Response.json({ id: "cs_1", object: "checkout.session", url })) as unknown as typeof fetch);
    };

    const sentParams = (): URLSearchParams => {
      const [, init] = fetchSpy.mock.calls[0] ?? [];

      return new URLSearchParams(String(init?.body));
    };

    test("returns the url of the checkout", async () => {
      mockCheckout({ url: CHECKOUT_URL });

      const result = await StripePaymentProvider.create().checkout(args);

      expect(result).toEqual({ url: CHECKOUT_URL });
    });

    test("stores the organization on the subscription", async () => {
      mockCheckout({ url: CHECKOUT_URL });

      await StripePaymentProvider.create().checkout(args);

      expect(sentParams().get("subscription_data[metadata][organizationId]")).toBe(ORGANIZATION_ID);
    });

    test("creates a subscription for the price", async () => {
      mockCheckout({ url: CHECKOUT_URL });

      await StripePaymentProvider.create().checkout(args);

      const params = sentParams();

      expect(params.get("mode")).toBe("subscription");
      expect(params.get("line_items[0][price]")).toBe("price_1");
      expect(params.get("line_items[0][quantity]")).toBe("1");
      expect(params.get("success_url")).toBe(args.successUrl);
      expect(params.get("cancel_url")).toBe(args.cancelUrl);
    });

    test("does not set a client reference", async () => {
      mockCheckout({ url: CHECKOUT_URL });

      await StripePaymentProvider.create().checkout(args);

      expect(sentParams().has("client_reference_id")).toBe(false);
    });

    test("rejects an invalid organization without calling Stripe", async () => {
      await expect(
        StripePaymentProvider.create().checkout({ ...args, organizationId: "not-an-organization" }),
      ).rejects.toThrow();

      expect(fetchSpy).not.toHaveBeenCalled();
    });

    test("throws when Stripe returns no url", async () => {
      mockCheckout({ url: null });

      await expect(StripePaymentProvider.create().checkout(args)).rejects.toThrow();
    });
  });
});
