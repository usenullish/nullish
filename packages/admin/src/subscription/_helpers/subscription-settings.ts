import { eq } from "drizzle-orm";
import { assertArrayExactlyOne } from "@usenullish/nullish-common";
import { type Tx, updateMany } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const subscriptionSettings = DbSchema.Subscription.SubscriptionSettings.SubscriptionSettingsSchema;

type SubscriptionSettings = Records["Subscription"]["SubscriptionSettings"]["Select"];

export const updateSubscriptionSettings = async ({
  tx,
  settings,
}: {
  tx: Tx;
  settings: Records["Subscription"]["SubscriptionSettings"]["Update"];
}): Promise<SubscriptionSettings> => {
  const rows = await updateMany({
    tx,
    table: subscriptionSettings,
    values: settings,
    returningSchema:
      RecordsSchema.Subscription.SubscriptionSettingsSchema.SelectSubscriptionSettingsSchema,
    where: eq(subscriptionSettings.id, 1),
  });

  assertArrayExactlyOne(rows);

  const [row] = rows;
  return row;
};
