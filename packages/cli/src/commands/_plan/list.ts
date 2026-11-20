import { withDbContext } from "../../db";
import { listPlans } from "./_plans";

export const planList = async (_args?: string[]) => {
  await withDbContext(async (dbContext) => {
    const plans = await listPlans({ dbContext });

    console.table(plans);
  });
};
