import { and, eq } from "drizzle-orm";
import { assertArrayAtMostOne, type Option } from "@usenullish/nullish-common";
import { selectMany, type Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import type { Payments } from "@usenullish/nullish-schema/payments";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;
const references = DbSchema.Subscription.SubscriptionReferences.SubscriptionReferencesSchema;

type Subscription = Records["Subscription"]["Subscriptions"]["Select"];
type SubscriptionReference = Records["Subscription"]["SubscriptionReferences"]["Select"];

export const getSubscriptionReference = async ({
  tx,
  subscriptionId,
}: {
  tx: Tx;
  subscriptionId: SubscriptionReference["subscriptionId"];
}): Promise<Option<SubscriptionReference>> => {
  const rows = await selectMany({
    tx,
    table: references,
    schema:
      RecordsSchema.Subscription.SubscriptionReferencesSchema.SelectSubscriptionReferencesSchema,
    where: eq(references.subscriptionId, subscriptionId),
  });

  assertArrayAtMostOne(rows);

  const [reference] = rows;
  return reference;
};

export const getReferencedOrganizationId = async ({
  tx,
  provider,
  externalSubscriptionId,
}: {
  tx: Tx;
} & Pick<SubscriptionReference, "provider" | "externalSubscriptionId">): Promise<
  Option<Subscription["organizationId"]>
> => {
  const rows = await tx
    .select({ organizationId: subscriptions.organizationId })
    .from(references)
    .innerJoin(subscriptions, eq(subscriptions.id, references.subscriptionId))
    .where(
      and(
        eq(references.provider, provider),
        eq(references.externalSubscriptionId, externalSubscriptionId),
      ),
    );

  assertArrayAtMostOne(rows);

  const [row] = rows;
  return row?.organizationId;
};

export const insertSubscriptionReference = async ({
  tx,
  subscriptionId,
  provider,
  externalIds: { customerId, subscriptionId: externalSubscriptionId },
}: {
  tx: Tx;
  externalIds: Payments["PaymentExternalIds"];
} & Pick<SubscriptionReference, "subscriptionId" | "provider">): Promise<void> => {
  await tx.insert(references).values({
    subscriptionId,
    provider,
    externalCustomerId: customerId,
    externalSubscriptionId,
  });
};
