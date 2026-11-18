import { assertNotEmptyString, notEmptyString } from "@usenullish/nullish-common";

export const envPaymentsEnabled = (): boolean =>
  [process.env.NULLISH_STRIPE_SECRET_KEY, process.env.NULLISH_STRIPE_WEBHOOK_SECRET].every(
    notEmptyString,
  );

export const envStripeSecretKey = (): string => {
  const secretKey = process.env.NULLISH_STRIPE_SECRET_KEY;
  assertNotEmptyString(secretKey, "A secret key for Stripe must be defined.");
  return secretKey;
};

export const envStripeWebhookSecret = (): string => {
  const webhookSecret = process.env.NULLISH_STRIPE_WEBHOOK_SECRET;
  assertNotEmptyString(webhookSecret, "A webhook secret for Stripe must be defined.");
  return webhookSecret;
};
