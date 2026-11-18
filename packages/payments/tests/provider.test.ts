import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { StripePaymentProvider } from "../src/_stripe";
import { createPaymentProvider } from "../src/provider";

describe("createPaymentProvider", () => {
  const KEYS = ["NULLISH_STRIPE_SECRET_KEY", "NULLISH_STRIPE_WEBHOOK_SECRET"] as const;

  const saved = new Map<string, string | undefined>();

  beforeEach(() => {
    for (const key of KEYS) {
      saved.set(key, process.env[key]);
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of KEYS) {
      const value = saved.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  test("returns the Stripe provider when Stripe is defined", () => {
    process.env.NULLISH_STRIPE_SECRET_KEY = "sk_test_123";
    process.env.NULLISH_STRIPE_WEBHOOK_SECRET = "whsec_test";

    const result = createPaymentProvider();

    expect(result.status).toBe("success");
    expect(result.status === "success" && result.result).toBeInstanceOf(StripePaymentProvider);
  });

  test("returns an error when the secret key is not defined", () => {
    process.env.NULLISH_STRIPE_WEBHOOK_SECRET = "whsec_test";

    expect(createPaymentProvider().status).toBe("error");
  });
});
