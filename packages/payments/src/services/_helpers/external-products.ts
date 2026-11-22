import { and, eq, gt, isNull, or, sql } from "drizzle-orm";
import { assertArrayExactlyOne } from "@usenullish/nullish-common";
import { selectMany, type Tx } from "@usenullish/nullish-db";
import { DbSchema, type SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const externalProducts = DbSchema.Subscription.ExternalProducts.ExternalProductsSchema;
const plans = DbSchema.Subscription.Plans.PlansSchema;

type ExternalProduct = Records["Subscription"]["ExternalProducts"]["Select"];

export const getAvailableExternalProduct = async ({
  tx,
  provider,
  externalProductId,
}: {
  tx: Tx;
  provider: SubscriptionProvider;
  externalProductId: ExternalProduct["externalProductId"];
}): Promise<ExternalProduct> => {
  const rows = await tx
    .select({ product: externalProducts })
    .from(externalProducts)
    .innerJoin(plans, eq(plans.id, externalProducts.planId))
    .where(
      and(
        eq(externalProducts.provider, provider),
        eq(externalProducts.externalProductId, externalProductId),
        or(isNull(plans.expiresAt), gt(plans.expiresAt, sql`now()`)),
      ),
    );

  assertArrayExactlyOne(rows);

  const [{ product }] = rows;

  return RecordsSchema.Subscription.ExternalProductsSchema.SelectExternalProductsSchema.parse(
    product,
  );
};

export const getExternalProduct = async ({
  tx,
  provider,
  externalProductId,
}: {
  tx: Tx;
  provider: SubscriptionProvider;
  externalProductId: ExternalProduct["externalProductId"];
}): Promise<ExternalProduct> => {
  const rows = await selectMany({
    tx,
    table: externalProducts,
    schema: RecordsSchema.Subscription.ExternalProductsSchema.SelectExternalProductsSchema,
    where: and(
      eq(externalProducts.provider, provider),
      eq(externalProducts.externalProductId, externalProductId),
    ),
  });

  assertArrayExactlyOne(rows);

  const [product] = rows;
  return product;
};

export const listExternalProducts = async ({ tx }: { tx: Tx }): Promise<ExternalProduct[]> => {
  const rows = await tx
    .select({ product: externalProducts })
    .from(externalProducts)
    .innerJoin(plans, eq(plans.id, externalProducts.planId))
    .where(or(isNull(plans.expiresAt), gt(plans.expiresAt, sql`now()`)));

  return rows.map(({ product }) =>
    RecordsSchema.Subscription.ExternalProductsSchema.SelectExternalProductsSchema.parse(product),
  );
};
