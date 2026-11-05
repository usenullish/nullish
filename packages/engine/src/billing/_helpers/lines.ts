import type { Tx } from "@usenullish/nullish-db";
import { selectMany } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { eq } from "drizzle-orm";
import { assertArrayAtLeastOne } from "@usenullish/nullish-common";

type Invoice = Records["Billing"]["Invoices"]["Select"];

type Line = Records["Billing"]["Lines"]["Select"];
type Lines = Line[];

export const listLines = async ({
  tx,
  invoiceId,
}: {
  tx: Tx;
  invoiceId: Invoice["id"];
}): Promise<Lines> => {
  const lines = await selectMany({
    tx,
    table: DbSchema.Billing.Invoices.LinesSchema,
    schema: RecordsSchema.Billing.InvoicesSchema.SelectLinesSchema,
    where: eq(DbSchema.Billing.Invoices.LinesSchema.invoiceId, invoiceId),
  });

  assertArrayAtLeastOne(lines);

  return lines;
};
