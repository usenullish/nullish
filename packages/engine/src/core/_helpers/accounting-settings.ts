import type { Tx } from "@usenullish/nullish-db";
import { selectMany } from "@usenullish/nullish-db";
import { DbSchema } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { eq } from "drizzle-orm";
import { assertArrayExactlyOne } from "@usenullish/nullish-common";

type SelectAccountingSettings = Records["Core"]["AccountingSettings"]["Select"];

export const getAccountingSetting = async ({
  tx,
  organizationId,
}: { tx: Tx } & Pick<
  SelectAccountingSettings,
  "organizationId"
>): Promise<SelectAccountingSettings> => {
  const settings = await selectMany({
    tx,
    table: DbSchema.Core.Accounting.AccountingSettingsSchema,
    schema: RecordsSchema.Core.AccountingSchema.SelectAccountingSettingsSchema,
    where: eq(DbSchema.Core.Accounting.AccountingSettingsSchema.organizationId, organizationId),
  });

  assertArrayExactlyOne(settings);

  const [setting] = settings;
  return setting;
};
