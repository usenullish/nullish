import { assertNonNullish } from "@usenullish/nullish-common";
import { insertMany, type Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const taxRates = DbSchema.Subscription.SubscriptionTaxRates.SubscriptionTaxRatesSchema;

type SubscriptionTaxRate = Records["Subscription"]["SubscriptionTaxRates"]["Select"];

export const insertSubscriptionTaxRate = async ({
  tx,
  taxRate,
}: {
  tx: Tx;
  taxRate: Records["Subscription"]["SubscriptionTaxRates"]["Insert"];
}): Promise<SubscriptionTaxRate> => {
  const [row] = await insertMany({
    tx,
    table: taxRates,
    values: taxRate,
    returningSchema:
      RecordsSchema.Subscription.SubscriptionTaxRatesSchema.SelectSubscriptionTaxRatesSchema,
  });

  assertNonNullish(row);

  return row;
};
