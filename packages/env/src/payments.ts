import {
  assertNotEmptyString,
  isEmptyString,
  notEmptyString,
  type Option,
} from "@usenullish/nullish-common";
import * as z from "zod";
import { isProd } from "./mode";

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

const StripeApiUrlSchema = z.url({ protocol: /^https?$/ }).transform((url) => new URL(url));

export const envStripeApiUrl = (): Option<URL> => {
  const apiUrl = process.env.NULLISH_STRIPE_API_URL;

  if (isEmptyString(apiUrl)) {
    return undefined;
  }

  if (isProd()) {
    throw new Error("NULLISH_STRIPE_API_URL can only be used outside production, e.g. for tests.");
  }

  return StripeApiUrlSchema.parse(apiUrl);
};
