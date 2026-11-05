import type { Tx } from "@usenullish/nullish-db";
import { selectMany, updateMany } from "@usenullish/nullish-db";
import { type Db, DbSchema, PeriodStatus } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { and, asc, eq, gt, lt } from "drizzle-orm";
import type { LockStrength } from "drizzle-orm/pg-core";
import { assertArrayExactlyOne, type Option } from "@usenullish/nullish-common";

type SelectPeriod = Records["Ledger"]["Periods"]["Select"];
type UpdatePeriod = Records["Ledger"]["Periods"]["Update"];

export const getPeriod = async ({
  tx,
  id,
  lock,
}: {
  tx: Tx;
  id: SelectPeriod["id"];
  lock?: LockStrength;
}): Promise<SelectPeriod> => {
  const periods = await selectMany({
    tx,
    table: DbSchema.Ledger.Periods.PeriodsSchema,
    schema: RecordsSchema.Ledger.PeriodsSchema.SelectPeriodsSchema,
    where: eq(DbSchema.Ledger.Periods.PeriodsSchema.id, id),
    lock,
  });

  assertArrayExactlyOne(periods);

  const [period] = periods;
  return period;
};

export const listOpenPeriodsBefore = async ({
  tx,
  organizationId,
  startOn,
}: { tx: Tx } & Pick<SelectPeriod, "organizationId" | "startOn">): Promise<SelectPeriod[]> =>
  await selectMany({
    tx,
    table: DbSchema.Ledger.Periods.PeriodsSchema,
    schema: RecordsSchema.Ledger.PeriodsSchema.SelectPeriodsSchema,
    where: and(
      eq(DbSchema.Ledger.Periods.PeriodsSchema.organizationId, organizationId),
      eq(DbSchema.Ledger.Periods.PeriodsSchema.status, PeriodStatus.OPEN),
      lt(DbSchema.Ledger.Periods.PeriodsSchema.endOn, startOn),
    ),
  });

export const findNextPeriod = async ({
  tx,
  organizationId,
  endOn,
}: { tx: Tx } & Pick<SelectPeriod, "organizationId" | "endOn">): Promise<Option<SelectPeriod>> => {
  const [period] = await selectMany({
    tx,
    table: DbSchema.Ledger.Periods.PeriodsSchema,
    schema: RecordsSchema.Ledger.PeriodsSchema.SelectPeriodsSchema,
    where: and(
      eq(DbSchema.Ledger.Periods.PeriodsSchema.organizationId, organizationId),
      gt(DbSchema.Ledger.Periods.PeriodsSchema.startOn, endOn),
    ),
    orderBy: [asc(DbSchema.Ledger.Periods.PeriodsSchema.startOn)],
    pagination: { limit: 1, offset: 0 },
  });

  return period;
};

export const updatePeriod = async ({
  tx,
  id,
  values,
}: {
  tx: Tx;
  id: SelectPeriod["id"];
  values: Partial<UpdatePeriod>;
}): Promise<SelectPeriod> => {
  const periods = await updateMany<SelectPeriod, Db["Ledger"]["Periods"]>({
    tx,
    table: DbSchema.Ledger.Periods.PeriodsSchema,
    values,
    returningSchema: RecordsSchema.Ledger.PeriodsSchema.SelectPeriodsSchema,
    where: eq(DbSchema.Ledger.Periods.PeriodsSchema.id, id),
  });

  assertArrayExactlyOne(periods);

  const [period] = periods;
  return period;
};
