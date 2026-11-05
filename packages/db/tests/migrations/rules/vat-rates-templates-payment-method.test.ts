import { afterAll, describe, expect, test } from "bun:test";
import { SQL as BunSQL } from "bun";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sql";
import { VatPaymentMethod, VatType } from "@usenullish/nullish-schema/db";
import type { Nullable } from "@usenullish/nullish-common";
import { envDbUrl } from "@usenullish/nullish-env";
import { causeMessage } from "../_test-utils";

const client = new BunSQL(envDbUrl());
const db = drizzle({ client });

const insertTemplate = ({
  code,
  type,
  paymentMethod,
}: {
  code: string;
  type: VatType;
  paymentMethod: Nullable<VatPaymentMethod>;
}): Promise<unknown> =>
  db.execute(
    sql`INSERT INTO templates.vat_rates (code, type, payment_method, rate, start_on) VALUES (${code}, ${type}::core.vat_type, ${paymentMethod}::core.vat_payment_method, 8.1, '2030-01-01')`,
  );

const CHECK = "vat_rates_templates_payment_method";

describe("vat_rates_templates_payment_method", () => {
  afterAll(async () => {
    await client.close();
  });

  test("rejects a net rate tax template", async () => {
    const error = await insertTemplate({
      code: "TEST_NET",
      type: VatType.NET_RATE_TAX,
      paymentMethod: VatPaymentMethod.NET_RATE,
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(CHECK);
  });

  test.each([
    VatType.SALES_TAX_DUE,
    VatType.INPUT_TAX_MATERIALS,
    VatType.INPUT_TAX_INVESTMENTS,
    VatType.IMPORT_TAX_MATERIALS,
    VatType.IMPORT_TAX_INVESTMENTS,
  ])("rejects a %s template without the effective method", async (type) => {
    const error = await insertTemplate({
      code: `TEST_${type}`,
      type,
      paymentMethod: null,
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(CHECK);
  });

  test("rejects a sales tax template for the net rate method", async () => {
    const error = await insertTemplate({
      code: "TEST_SALES_NET",
      type: VatType.SALES_TAX_DUE,
      paymentMethod: VatPaymentMethod.NET_RATE,
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(CHECK);
  });

  test("rejects a template common to both methods bound to a payment method", async () => {
    const error = await insertTemplate({
      code: "TEST_COMMON",
      type: VatType.NON_TAXABLE_TURNOVER,
      paymentMethod: VatPaymentMethod.EFFECTIVE,
    }).catch((e: unknown) => e);

    expect(causeMessage(error)).toContain(CHECK);
  });

  test("seeds the effective only templates with the effective method and the others for both", async () => {
    const rows = await db.execute<{ code: string; payment_method: Nullable<string> }>(
      sql`SELECT code, payment_method FROM templates.vat_rates ORDER BY code`,
    );

    expect([...rows]).toEqual([
      { code: "BZB81", payment_method: null },
      { code: "BZM81", payment_method: null },
      { code: "CEX", payment_method: null },
      { code: "DOUACE", payment_method: VatPaymentMethod.EFFECTIVE },
      { code: "DOUAM", payment_method: VatPaymentMethod.EFFECTIVE },
      { code: "SPE", payment_method: null },
      { code: "UN81", payment_method: VatPaymentMethod.EFFECTIVE },
      { code: "UR26", payment_method: VatPaymentMethod.EFFECTIVE },
      { code: "US38", payment_method: VatPaymentMethod.EFFECTIVE },
      { code: "VB26", payment_method: VatPaymentMethod.EFFECTIVE },
      { code: "VB38", payment_method: VatPaymentMethod.EFFECTIVE },
      { code: "VB81", payment_method: VatPaymentMethod.EFFECTIVE },
      { code: "VM26", payment_method: VatPaymentMethod.EFFECTIVE },
      { code: "VM38", payment_method: VatPaymentMethod.EFFECTIVE },
      { code: "VM81", payment_method: VatPaymentMethod.EFFECTIVE },
    ]);
  });
});
