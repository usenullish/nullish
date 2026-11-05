import { selectMany, type Tx } from "@usenullish/nullish-db";
import { type Option, type Result, tryCatch } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { eq } from "drizzle-orm";

type VatRate = Records["Core"]["VatRates"]["Select"];
type VatSetting = Records["Core"]["VatSettings"]["Select"];
type VatMethods = Records["Core"]["VatMethods"]["Select"];

export const getVatSettingByOrgId = async ({
  tx,
  organizationId,
}: { tx: Tx } & Pick<VatSetting, "organizationId">): Promise<Result<Option<VatSetting>>> => {
  return tryCatch(async () => {
    const [row] = await selectMany({
      tx,
      table: DbSchema.Core.Vat.VatSettingsSchema,
      schema: RecordsSchema.Core.VatSchema.SelectVatSettingsSchema,
      where: eq(DbSchema.Core.Vat.VatSettingsSchema.organizationId, organizationId),
    });

    return row;
  });
};

export const listVatMethodsByOrgId = async ({
  tx,
  organizationId,
}: { tx: Tx } & Pick<VatMethods, "organizationId">): Promise<Result<VatMethods[]>> => {
  return tryCatch(async () => {
    return await selectMany({
      tx,
      table: DbSchema.Core.Vat.VatMethodsSchema,
      schema: RecordsSchema.Core.VatSchema.SelectVatMethodsSchema,
      where: eq(DbSchema.Core.Vat.VatMethodsSchema.organizationId, organizationId),
    });
  });
};

export const listVatRatesByOrgId = async ({
  tx,
  organizationId,
}: { tx: Tx } & Pick<VatRate, "organizationId">): Promise<Result<VatRate[]>> => {
  return tryCatch(async () => {
    return await selectMany({
      tx,
      table: DbSchema.Core.Vat.VatRatesSchema,
      schema: RecordsSchema.Core.VatSchema.SelectVatRatesSchema,
      where: eq(DbSchema.Core.Vat.VatRatesSchema.organizationId, organizationId),
    });
  });
};
