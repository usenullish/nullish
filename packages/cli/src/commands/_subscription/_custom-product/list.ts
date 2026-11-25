import { withDbContext } from "../../../db";
import { listCustomProducts } from "./_custom-products";

export const subscriptionCustomProductList = async (_args?: string[]) => {
  await withDbContext(async (dbContext) => {
    const products = await listCustomProducts({ dbContext });

    console.table(products);
  });
};
