import { ExternalProductsService } from "@usenullish/nullish-admin/subscription";
import type { DbAdminContext } from "@usenullish/nullish-db";
import type { Records } from "@usenullish/nullish-schema/records";
import { exit } from "../../../utils/exit";

type ExternalProduct = Records["Subscription"]["ExternalProducts"]["Select"];

export const listProducts = async ({
  dbContext,
}: {
  dbContext: DbAdminContext;
}): Promise<ExternalProduct[]> => {
  const result = await ExternalProductsService.create({ db: dbContext.connection }).list();

  if (result.status === "error") {
    exit({
      msg: "Cannot list the products.",
      err: result.err,
    });
  }

  return result.result;
};

export const productLabel = ({
  id,
  planId,
  provider,
  externalProductId,
  name,
}: ExternalProduct): string =>
  `${id} ${name} (plan: ${planId}, provider: ${provider}, product: ${externalProductId})`;
