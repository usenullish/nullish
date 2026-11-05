import { selectMany, type Tx } from "@usenullish/nullish-db";
import { assertArrayExactlyOne, type Result, tryCatch } from "@usenullish/nullish-common";
import { DbSchema, PeriodStatus } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { and, eq, lte } from "drizzle-orm";

type Period = Records["Ledger"]["Periods"]["Select"];

export const listPeriodsByOrgId = async ({
  tx,
  organizationId,
}: { tx: Tx } & Pick<Period, "organizationId">): Promise<Result<Period[]>> => {
  return tryCatch(async () => {
    return selectMany({
      tx,
      table: DbSchema.Ledger.Periods.PeriodsSchema,
      schema: RecordsSchema.Ledger.PeriodsSchema.SelectPeriodsSchema,
      where: eq(DbSchema.Ledger.Periods.PeriodsSchema.organizationId, organizationId),
    });
  });
};

export const getOpenPeriod = async ({
  tx,
  organizationId,
  validOn,
}: { tx: Tx; validOn: Period["startOn"] } & Pick<Period, "organizationId">): Promise<
  Result<Period>
> => {
  return tryCatch(async () => {
    const periods = await selectMany({
      tx,
      table: DbSchema.Ledger.Periods.PeriodsSchema,
      schema: RecordsSchema.Ledger.PeriodsSchema.SelectPeriodsSchema,
      where: and(
        eq(DbSchema.Ledger.Periods.PeriodsSchema.organizationId, organizationId),
        eq(DbSchema.Ledger.Periods.PeriodsSchema.status, PeriodStatus.OPEN),
        lte(DbSchema.Ledger.Periods.PeriodsSchema.startOn, validOn),
      ),
    });

    assertArrayExactlyOne(periods);

    const [period] = periods;
    return period;
  });
};
