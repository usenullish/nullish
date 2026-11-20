import { assertNonNullish } from "@usenullish/nullish-common";
import { insertMany, type Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const customPrices = DbSchema.Subscription.CustomPrices.CustomPricesSchema;

type CustomPrice = Records["Subscription"]["CustomPrices"]["Select"];

export const insertCustomPrice = async ({
  tx,
  customPrice,
}: {
  tx: Tx;
  customPrice: Records["Subscription"]["CustomPrices"]["Insert"];
}): Promise<CustomPrice> => {
  const [row] = await insertMany({
    tx,
    table: customPrices,
    values: customPrice,
    returningSchema: RecordsSchema.Subscription.CustomPricesSchema.SelectCustomPricesSchema,
  });

  assertNonNullish(row);

  return row;
};
