import { selectMany, type Tx } from "@usenullish/nullish-db";
import { type Option, type Result, tryCatch } from "@usenullish/nullish-common";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { eq } from "drizzle-orm";

type Currency = Records["Core"]["Currencies"]["Select"];
export type BaseCurrency = Pick<Currency, "code" | "decimals">;

export const getBaseCurrencyByOrgId = async ({
  tx,
  organizationId,
}: { tx: Tx } & Pick<Records["Core"]["AccountingSettings"]["Select"], "organizationId">): Promise<
  Result<Option<BaseCurrency>>
> => {
  return tryCatch(async () => {
    const [row] = await tx
      .select({
        code: DbSchema.Core.Currencies.CurrenciesSchema.code,
        decimals: DbSchema.Core.Currencies.CurrenciesSchema.decimals,
      })
      .from(DbSchema.Core.Accounting.AccountingSettingsSchema)
      .innerJoin(
        DbSchema.Core.Currencies.CurrenciesSchema,
        eq(
          DbSchema.Core.Currencies.CurrenciesSchema.code,
          DbSchema.Core.Accounting.AccountingSettingsSchema.baseCurrency,
        ),
      )
      .where(eq(DbSchema.Core.Accounting.AccountingSettingsSchema.organizationId, organizationId))
      .limit(1);

    return row;
  });
};

export const listCurrencies = async ({ tx }: { tx: Tx }): Promise<Result<Currency[]>> => {
  return tryCatch(async () => {
    return await selectMany({
      tx,
      table: DbSchema.Core.Currencies.CurrenciesSchema,
      schema: RecordsSchema.Core.CurrenciesSchema.SelectCurrenciesSchema,
    });
  });
};
