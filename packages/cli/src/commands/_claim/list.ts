import { withDbContext } from "../../db";
import { listClaims } from "./_claims";

export const claimList = async (_args?: string[]) => {
  await withDbContext(async (dbContext) => {
    const claims = await listClaims({ dbContext });

    console.table(claims);
  });
};
