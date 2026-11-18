import { and, eq } from "drizzle-orm";
import { assertArrayExactlyOne } from "@usenullish/nullish-common";
import { selectMany, type Tx } from "@usenullish/nullish-db";
import { DbSchema, type SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";

const claims = DbSchema.Subscription.Claims.ClaimsSchema;

type Claim = Records["Subscription"]["Claims"]["Select"];

export const getClaimByExternalProduct = async ({
  tx,
  provider,
  externalProductId,
}: {
  tx: Tx;
  provider: SubscriptionProvider;
  externalProductId: NonNullable<Claim["externalProductId"]>;
}): Promise<Claim> => {
  const rows = await selectMany({
    tx,
    table: claims,
    schema: RecordsSchema.Subscription.ClaimsSchema.SelectClaimsSchema,
    where: and(eq(claims.provider, provider), eq(claims.externalProductId, externalProductId)),
  });

  assertArrayExactlyOne(rows);

  const [claim] = rows;
  return claim;
};
