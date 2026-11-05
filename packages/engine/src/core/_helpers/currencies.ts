import type { Tx } from "@usenullish/nullish-db";
import { selectMany } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { eq, inArray } from "drizzle-orm";
import { assertArrayExactlyOne } from "@usenullish/nullish-common";

type SelectCurrencies = Records["Core"]["Currencies"]["Select"];

export const getCurrency = async ({
  tx,
  code,
}: { tx: Tx } & Pick<SelectCurrencies, "code">): Promise<SelectCurrencies> => {
  const currencies = await selectMany({
    tx,
    table: DbSchema.Core.Currencies.CurrenciesSchema,
    schema: RecordsSchema.Core.CurrenciesSchema.SelectCurrenciesSchema,
    where: eq(DbSchema.Core.Currencies.CurrenciesSchema.code, code),
  });

  assertArrayExactlyOne(currencies);

  const [currency] = currencies;
  return currency;
};

export const listCurrencies = ({
  tx,
  codes,
}: {
  tx: Tx;
  codes: [SelectCurrencies["code"], ...SelectCurrencies["code"][]];
}): Promise<SelectCurrencies[]> =>
  selectMany({
    tx,
    table: DbSchema.Core.Currencies.CurrenciesSchema,
    schema: RecordsSchema.Core.CurrenciesSchema.SelectCurrenciesSchema,
    where: inArray(DbSchema.Core.Currencies.CurrenciesSchema.code, codes),
  });
