import { eq } from "drizzle-orm";
import type { LockStrength } from "drizzle-orm/pg-core";
import { assertArrayExactlyOne } from "@usenullish/nullish-common";
import { selectMany, type Tx, updateMany } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import type { Payments } from "@usenullish/nullish-schema/payments";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

type Subscription = Records["Subscription"]["Subscriptions"]["Select"];

export const getExistingSubscription = async ({
  tx,
  organizationId,
  lock,
}: {
  tx: Tx;
  organizationId: Subscription["organizationId"];
  lock?: LockStrength;
}): Promise<Subscription> => {
  const rows = await selectMany({
    tx,
    table: subscriptions,
    schema: RecordsSchema.Subscription.SubscriptionsSchema.SelectSubscriptionsSchema,
    where: eq(subscriptions.organizationId, organizationId),
    lock,
  });

  assertArrayExactlyOne(rows);

  const [subscription] = rows;
  return subscription;
};

export const updateSubscription = async ({
  tx,
  subscription: { id, claimId: currentClaimId },
  claimId,
  status,
  periodEnd,
}: {
  tx: Tx;
  subscription: Subscription;
  claimId: Subscription["claimId"];
} & Pick<Payments["Payment"], "status" | "periodEnd">): Promise<Subscription> => {
  const rows = await updateMany({
    tx,
    table: subscriptions,
    values: { status, periodEnd, ...(claimId !== currentClaimId && { claimId }) },
    returningSchema: RecordsSchema.Subscription.SubscriptionsSchema.SelectSubscriptionsSchema,
    where: eq(subscriptions.id, id),
  });

  assertArrayExactlyOne(rows);

  const [subscription] = rows;
  return subscription;
};
