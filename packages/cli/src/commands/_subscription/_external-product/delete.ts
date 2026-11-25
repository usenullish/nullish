import { intro, isCancel, log, note, select } from "@clack/prompts";
import { ExternalProductsService } from "@usenullish/nullish-admin/subscription";
import { isArrayAtLeastOne, isNullish } from "@usenullish/nullish-common";
import { withDbContext } from "../../../db";
import { lime } from "../../../utils/colors";
import { cancel, exit } from "../../../utils/exit";
import { externalProductLabel, listExternalProducts } from "./_external-products";

export const subscriptionExternalProductDelete = async (_args?: string[]) => {
  console.log();
  intro(lime("nullish"));

  await withDbContext(async (dbContext) => {
    const products = await listExternalProducts({ dbContext });

    if (!isArrayAtLeastOne(products)) {
      log.info("There is no product.");
      return;
    }

    const productId = await select({
      message: "Which product should be deleted?",
      options: products.map((product) => ({
        label: externalProductLabel(product),
        value: product.id,
      })),
    });

    if (isCancel(productId)) {
      cancel();
    }

    const result = await ExternalProductsService.create({ db: dbContext.connection }).delete({
      productId,
    });

    if (result.status === "error") {
      exit({
        msg: `Cannot delete the product ${productId}.`,
        err: result.err,
      });
    }

    if (isNullish(result.result)) {
      exit({ msg: `The product ${productId} was not found.` });
    }

    note(externalProductLabel(result.result), "Product deleted.");
  });
};
