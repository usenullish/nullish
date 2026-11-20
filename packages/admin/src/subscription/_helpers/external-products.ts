import { assertNonNullish } from "@usenullish/nullish-common";
import { insertMany, type Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const externalProducts = DbSchema.Subscription.ExternalProducts.ExternalProductsSchema;

type ExternalProduct = Records["Subscription"]["ExternalProducts"]["Select"];

export const insertExternalProduct = async ({
  tx,
  externalProduct,
}: {
  tx: Tx;
  externalProduct: Records["Subscription"]["ExternalProducts"]["Insert"];
}): Promise<ExternalProduct> => {
  const [row] = await insertMany({
    tx,
    table: externalProducts,
    values: externalProduct,
    returningSchema: RecordsSchema.Subscription.ExternalProductsSchema.SelectExternalProductsSchema,
  });

  assertNonNullish(row);

  return row;
};
