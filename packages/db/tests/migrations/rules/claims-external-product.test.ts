import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { envDbUrl } from "@usenullish/nullish-env";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { causeMessage, resetDb, seedUsers } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const claims = DbSchema.Subscription.Claims.ClaimsSchema;

describe("claims_external_product_uidx", () => {
  beforeAll(async () => {
    await resetDb(db);
    await seedUsers(db);
  });

  afterAll(async () => {
    await resetDb(db);
    await client.close();
  });

  test("rejects two claims with the same external product", async () => {
    const externalProductId = `prod_${crypto.randomUUID()}`;

    await db.insert(claims).values({ externalProductId });

    const error = await db
      .insert(claims)
      .values({ externalProductId })
      .catch((e: unknown) => e);

    await db.delete(claims).where(eq(claims.externalProductId, externalProductId));

    expect(causeMessage(error)).toContain("claims_external_product_uidx");
  });

  test("allows several claims without external product", async () => {
    const rows = await db.insert(claims).values([{}, {}]).returning();

    await db.delete(claims).where(
      inArray(
        claims.id,
        rows.map(({ id }) => id),
      ),
    );

    expect(rows).toHaveLength(2);
  });
});
