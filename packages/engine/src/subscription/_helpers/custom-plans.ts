import { asc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";
import { isArrayEmpty } from "@usenullish/nullish-common";
import type { Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Composites, CompositesSchema } from "@usenullish/nullish-schema/composites";

type CustomPlan = Composites["CustomPlans"]["Select"];

const plans = DbSchema.Subscription.Plans.PlansSchema;
const customProducts = DbSchema.Subscription.CustomProducts.CustomProductsSchema;
const customPrices = DbSchema.Subscription.CustomPrices.CustomPricesSchema;

export const listCustomPlans = async ({ tx }: { tx: Tx }): Promise<CustomPlan[]> => {
  const rows = await tx
    .select({ plan: plans, product: customProducts })
    .from(customProducts)
    .innerJoin(plans, eq(plans.id, customProducts.planId))
    .where(or(isNull(plans.expiresAt), gt(plans.expiresAt, sql`now()`)))
    .orderBy(asc(customProducts.name));

  if (isArrayEmpty(rows)) {
    return [];
  }

  const prices = await tx
    .select()
    .from(customPrices)
    .where(
      inArray(
        customPrices.productId,
        rows.map(({ product }) => product.id),
      ),
    );

  return rows.map(({ plan, product }) =>
    CompositesSchema.CustomPlansSchema.SelectCustomPlansSchema.parse({
      plan,
      product,
      prices: prices.filter(({ productId }) => productId === product.id),
    }),
  );
};
