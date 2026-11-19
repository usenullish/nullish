import { withDbContext } from "../../../db";
import { listTaxRates } from "./_tax-rates";

export const subscriptionTaxRateList = async (_args?: string[]) => {
  await withDbContext(async (dbContext) => {
    const taxRates = await listTaxRates({ dbContext });

    console.table(taxRates);
  });
};
