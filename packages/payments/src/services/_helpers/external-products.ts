import { and, eq } from "drizzle-orm";
import { assertArrayExactlyOne } from "@usenullish/nullish-common";
import { selectMany, type Tx } from "@usenullish/nullish-db";
import { DbSchema, type SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const externalProducts = DbSchema.Subscription.ExternalProducts.ExternalProductsSchema;

type ExternalProduct = Records["Subscription"]["ExternalProducts"]["Select"];

export const getExternalProduct = async ({
  tx,
  provider,
  externalProductId,
}: {
  tx: Tx;
  provider: SubscriptionProvider;
  externalProductId: ExternalProduct["externalProductId"];
}): Promise<ExternalProduct> => {
  const rows = await selectMany({
    tx,
    table: externalProducts,
    schema: RecordsSchema.Subscription.ExternalProductsSchema.SelectExternalProductsSchema,
    where: and(
      eq(externalProducts.provider, provider),
      eq(externalProducts.externalProductId, externalProductId),
    ),
  });

  assertArrayExactlyOne(rows);

  const [product] = rows;
  return product;
};

export const listExternalProducts = async ({ tx }: { tx: Tx }): Promise<ExternalProduct[]> => {
  return await selectMany({
    tx,
    table: externalProducts,
    schema: RecordsSchema.Subscription.ExternalProductsSchema.SelectExternalProductsSchema,
  });
};
