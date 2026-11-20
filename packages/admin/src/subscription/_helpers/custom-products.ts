import { assertNonNullish } from "@usenullish/nullish-common";
import { insertMany, type Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const customProducts = DbSchema.Subscription.CustomProducts.CustomProductsSchema;

type CustomProduct = Records["Subscription"]["CustomProducts"]["Select"];

export const insertCustomProduct = async ({
  tx,
  customProduct,
}: {
  tx: Tx;
  customProduct: Records["Subscription"]["CustomProducts"]["Insert"];
}): Promise<CustomProduct> => {
  const [row] = await insertMany({
    tx,
    table: customProducts,
    values: customProduct,
    returningSchema: RecordsSchema.Subscription.CustomProductsSchema.SelectCustomProductsSchema,
  });

  assertNonNullish(row);

  return row;
};
