import { eq } from "drizzle-orm";
import { assertArrayAtMostOne, type Option } from "@usenullish/nullish-common";
import { selectMany, type Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import type { Payments } from "@usenullish/nullish-schema/payments";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const references = DbSchema.Subscription.SubscriptionReferences.SubscriptionReferencesSchema;

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

export const insertSubscriptionReference = async ({
  tx,
  subscriptionId,
  provider,
  externalIds: { customerId, subscriptionId: externalSubscriptionId },
}: {
  tx: Tx;
  externalIds: Payments["ExternalIds"];
} & Pick<SubscriptionReference, "subscriptionId" | "provider">): Promise<void> => {
  await tx.insert(references).values({
    subscriptionId,
    provider,
    externalCustomerId: customerId,
    externalSubscriptionId,
  });
};
