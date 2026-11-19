import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { assertArrayAtMostOne, type Option } from "@usenullish/nullish-common";
import { selectMany, type Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const taxRates = DbSchema.Subscription.SubscriptionTaxRates.SubscriptionTaxRatesSchema;

type SubscriptionTaxRate = Records["Subscription"]["SubscriptionTaxRates"]["Select"];

export const getSubscriptionTaxRate = async ({
  tx,
  provider,
  validOn,
}: {
  tx: Tx;
  provider: SubscriptionTaxRate["provider"];
  validOn: SubscriptionTaxRate["startOn"];
}): Promise<Option<SubscriptionTaxRate>> => {
  const rows = await selectMany({
    tx,
    table: taxRates,
    schema: RecordsSchema.Subscription.SubscriptionTaxRatesSchema.SelectSubscriptionTaxRatesSchema,
    where: and(
      eq(taxRates.provider, provider),
      lte(taxRates.startOn, validOn),
      or(isNull(taxRates.endOn), gte(taxRates.endOn, validOn)),
    ),
  });

  assertArrayAtMostOne(rows);

  const [taxRate] = rows;
  return taxRate;
};
