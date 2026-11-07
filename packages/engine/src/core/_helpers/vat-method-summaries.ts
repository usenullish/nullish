import type { SelectManyFilterArgs, Tx } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records } from "@usenullish/nullish-schema/records";
import { type Composites, CompositesSchema } from "@usenullish/nullish-schema/composites";
import { eq } from "drizzle-orm";

type VatMethodSummary = Composites["VatMethodSummaries"]["Select"];

export const listVatMethodSummaries = async ({
  tx,
  organizationId,
  orderBy,
  pagination: { limit, offset },
}: {
  tx: Tx;
  organizationId: Records["Core"]["VatMethods"]["Select"]["organizationId"];
} & Required<SelectManyFilterArgs>): Promise<VatMethodSummary[]> => {
  const rows = await tx
    .select({
      vatMethod: DbSchema.Core.Vat.VatMethodsSchema,
      period: DbSchema.Ledger.Periods.PeriodsSchema,
    })
    .from(DbSchema.Core.Vat.VatMethodsSchema)
    .innerJoin(
      DbSchema.Ledger.Periods.PeriodsSchema,
      eq(DbSchema.Ledger.Periods.PeriodsSchema.id, DbSchema.Core.Vat.VatMethodsSchema.periodId),
    )
    .where(eq(DbSchema.Core.Vat.VatMethodsSchema.organizationId, organizationId))
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);

  return rows.map((row) =>
    CompositesSchema.VatMethodSummariesSchema.SelectVatMethodSummariesSchema.parse(row),
  );
};
