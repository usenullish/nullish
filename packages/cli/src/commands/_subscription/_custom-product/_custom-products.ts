import { CustomProductsService } from "@usenullish/nullish-admin/subscription";
import type { DbAdminContext } from "@usenullish/nullish-db";
import type { Records } from "@usenullish/nullish-schema/records";
import { exit } from "../../../utils/exit";

type CustomProduct = Records["Subscription"]["CustomProducts"]["Select"];

export const listCustomProducts = async ({
  dbContext,
}: {
  dbContext: DbAdminContext;
}): Promise<CustomProduct[]> => {
  const result = await CustomProductsService.create({ db: dbContext.connection }).list();

  if (result.status === "error") {
    exit({
      msg: "Cannot list the products.",
      err: result.err,
    });
  }

  return result.result;
};

export const customProductLabel = ({ id, planId, name, contactUrl }: CustomProduct): string =>
  `${id} ${name} (plan: ${planId}, contact: ${contactUrl})`;
