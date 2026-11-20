import { withDbContext } from "../../../db";
import { listProducts } from "./_products";

export const subscriptionProductList = async (_args?: string[]) => {
  await withDbContext(async (dbContext) => {
    const products = await listProducts({ dbContext });

    console.table(products);
  });
};
