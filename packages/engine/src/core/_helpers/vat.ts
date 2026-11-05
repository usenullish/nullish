import type { Tx } from "@usenullish/nullish-db";
import {
  assertArrayExactlyOne,
  isArrayEmpty,
  isNullish,
  type Option,
} from "@usenullish/nullish-common";
import { selectMany } from "@usenullish/nullish-db";
import { DbSchema, VatPeriodStatus, VatType } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { EngineError } from "../../errors";

type VatMethods = Records["Core"]["VatMethods"]["Select"];
type Periods = Records["Ledger"]["Periods"]["Select"];
type VatPeriods = Records["Core"]["VatPeriods"]["Select"];
type VatRates = Records["Core"]["VatRates"]["Select"];

export interface VatData {
  methods: VatMethods;
  rate: VatRates;
}

export class GetVatRateError extends EngineError {}
export class GetVatMethodsError extends EngineError {}

export const getVatMethods = async ({
  tx,
  organizationId,
  validOn,
}: { tx: Tx; validOn: Periods["startOn"] } & Pick<VatMethods, "organizationId">): Promise<
  Option<VatMethods>
> => {
  const periods = DbSchema.Ledger.Periods.PeriodsSchema;

  const vatMethods = await selectMany({
    tx,
    table: DbSchema.Core.Vat.VatMethodsSchema,
    schema: RecordsSchema.Core.VatSchema.SelectVatMethodsSchema,
    where: and(
      eq(DbSchema.Core.Vat.VatMethodsSchema.organizationId, organizationId),
      inArray(
        DbSchema.Core.Vat.VatMethodsSchema.periodId,
        tx
          .select({ id: periods.id })
          .from(periods)
          .where(
            and(
              eq(periods.organizationId, organizationId),
              lte(periods.startOn, validOn),
              gte(periods.endOn, validOn),
            ),
          ),
      ),
    ),
  });

  if (isArrayEmpty(vatMethods)) {
    return undefined;
  }

  assertArrayExactlyOne(vatMethods);

  const [vatMethod] = vatMethods;
  return vatMethod;
};

export const getVatPeriod = async ({
  tx,
  id,
  organizationId,
}: { tx: Tx } & Pick<VatPeriods, "id" | "organizationId">): Promise<VatPeriods> => {
  const vatPeriods = await selectMany({
    tx,
    table: DbSchema.Core.Vat.VatPeriodsSchema,
    schema: RecordsSchema.Core.VatSchema.SelectVatPeriodsSchema,
    where: and(
      eq(DbSchema.Core.Vat.VatPeriodsSchema.id, id),
      eq(DbSchema.Core.Vat.VatPeriodsSchema.organizationId, organizationId),
    ),
  });

  if (isArrayEmpty(vatPeriods)) {
    throw new GetVatRateError(`No VAT periods (${id}) defined`);
  }

  assertArrayExactlyOne(vatPeriods);

  const [vatPeriod] = vatPeriods;
  return vatPeriod;
};

export const listOpenVatPeriods = async ({
  tx,
  organizationId,
  startOn,
  endOn,
}: { tx: Tx } & Pick<VatPeriods, "organizationId" | "startOn" | "endOn">): Promise<VatPeriods[]> =>
  await selectMany({
    tx,
    table: DbSchema.Core.Vat.VatPeriodsSchema,
    schema: RecordsSchema.Core.VatSchema.SelectVatPeriodsSchema,
    where: and(
      eq(DbSchema.Core.Vat.VatPeriodsSchema.organizationId, organizationId),
      eq(DbSchema.Core.Vat.VatPeriodsSchema.status, VatPeriodStatus.OPEN),
      lte(DbSchema.Core.Vat.VatPeriodsSchema.startOn, endOn),
      gte(DbSchema.Core.Vat.VatPeriodsSchema.endOn, startOn),
    ),
  });

export const getVatRate = async ({
  tx,
  organizationId,
  validOn,
}: { tx: Tx; validOn: VatRates["startOn"] } & Pick<
  VatRates,
  "organizationId"
>): Promise<VatRates> => {
  const vatRates = await selectMany({
    tx,
    table: DbSchema.Core.Vat.VatRatesSchema,
    schema: RecordsSchema.Core.VatSchema.SelectVatRatesSchema,
    where: and(
      eq(DbSchema.Core.Vat.VatRatesSchema.organizationId, organizationId),
      eq(DbSchema.Core.Vat.VatRatesSchema.type, VatType.NET_RATE_TAX),
      lte(DbSchema.Core.Vat.VatRatesSchema.startOn, validOn),
      or(
        isNull(DbSchema.Core.Vat.VatRatesSchema.endOn),
        gte(DbSchema.Core.Vat.VatRatesSchema.endOn, validOn),
      ),
    ),
  });

  if (isArrayEmpty(vatRates)) {
    throw new GetVatRateError(
      `No VAT rate (${VatType.NET_RATE_TAX}) defined for the organization (${organizationId})`,
    );
  }

  assertArrayExactlyOne(vatRates);

  const [vatRate] = vatRates;
  return vatRate;
};

export const getVatRateById = async ({
  tx,
  id,
  organizationId,
  validOn,
}: { tx: Tx; validOn: VatRates["startOn"] } & Pick<
  VatRates,
  "id" | "organizationId"
>): Promise<VatRates> => {
  const vatRates = await selectMany({
    tx,
    table: DbSchema.Core.Vat.VatRatesSchema,
    schema: RecordsSchema.Core.VatSchema.SelectVatRatesSchema,
    where: and(
      eq(DbSchema.Core.Vat.VatRatesSchema.id, id),
      eq(DbSchema.Core.Vat.VatRatesSchema.organizationId, organizationId),
      lte(DbSchema.Core.Vat.VatRatesSchema.startOn, validOn),
      or(
        isNull(DbSchema.Core.Vat.VatRatesSchema.endOn),
        gte(DbSchema.Core.Vat.VatRatesSchema.endOn, validOn),
      ),
    ),
  });

  if (isArrayEmpty(vatRates)) {
    throw new GetVatRateError(
      `No VAT rate (${id}) valid on ${validOn.toISOString()} for the organization (${organizationId})`,
    );
  }

  assertArrayExactlyOne(vatRates);

  const [vatRate] = vatRates;
  return vatRate;
};

export const getVatData = async ({
  tx,
  organizationId,
  vatRateId,
  validOn,
}: {
  tx: Tx;
  vatRateId: VatRates["id"];
  validOn: VatRates["startOn"];
} & Pick<VatMethods, "organizationId">): Promise<Option<VatData>> => {
  const methods = await getVatMethods({ tx, organizationId, validOn });

  if (isNullish(methods)) {
    throw new GetVatMethodsError(
      `A VAT rate (${vatRateId}) is provided but the organization (${organizationId}) has no VAT methods on ${validOn.toISOString()}`,
    );
  }

  const rate = await getVatRateById({
    tx,
    id: vatRateId,
    organizationId,
    validOn,
  });

  return {
    methods,
    rate,
  };
};
