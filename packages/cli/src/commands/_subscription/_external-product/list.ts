import { withDbContext } from "../../../db";
import { listExternalProducts } from "./_external-products";

export const subscriptionExternalProductList = async (_args?: string[]) => {
  await withDbContext(async (dbContext) => {
    const products = await listExternalProducts({ dbContext });

    console.table(products);
  });
};
