import { asc, eq } from "drizzle-orm";
import { assertArrayAtMostOne, type Option, type Result } from "@usenullish/nullish-common";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { selectMany, updateMany } from "@usenullish/nullish-db";
import { AdminServiceContext, type AdminServiceContextArgs } from "../../_service";
import { insertSubscriptionTaxRate } from "../_helpers/subscription-tax-rates";

const taxRates = DbSchema.Subscription.SubscriptionTaxRates.SubscriptionTaxRatesSchema;

type SubscriptionTaxRate = Records["Subscription"]["SubscriptionTaxRates"]["Select"];

export class SubscriptionTaxRatesService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): SubscriptionTaxRatesService {
    return new this(args);
  }

  list(): Promise<Result<SubscriptionTaxRate[]>> {
    return this._withDbContext((tx) =>
      selectMany({
        tx,
        table: taxRates,
        schema:
          RecordsSchema.Subscription.SubscriptionTaxRatesSchema.SelectSubscriptionTaxRatesSchema,
        orderBy: [asc(taxRates.provider), asc(taxRates.startOn)],
      }),
    );
  }

  insert({
    taxRate,
  }: {
    taxRate: Records["Subscription"]["SubscriptionTaxRates"]["Insert"];
  }): Promise<Result<SubscriptionTaxRate>> {
    return this._withDbContext(async (tx) => {
      const values =
        RecordsSchema.Subscription.SubscriptionTaxRatesSchema.InsertSubscriptionTaxRatesSchema.parse(
          taxRate,
        );

      return await insertSubscriptionTaxRate({ tx, taxRate: values });
    });
  }

  update({
    taxRateId,
    taxRate,
  }: {
    taxRateId: SubscriptionTaxRate["id"];
    taxRate: Records["Subscription"]["SubscriptionTaxRates"]["Update"];
  }): Promise<Result<Option<SubscriptionTaxRate>>> {
    return this._withDbContext(async (tx) => {
      const values =
        RecordsSchema.Subscription.SubscriptionTaxRatesSchema.UpdateSubscriptionTaxRatesSchema.parse(
          taxRate,
        );

      const rows = await updateMany({
        tx,
        table: taxRates,
        values,
        returningSchema:
          RecordsSchema.Subscription.SubscriptionTaxRatesSchema.SelectSubscriptionTaxRatesSchema,
        where: eq(taxRates.id, taxRateId),
      });

      assertArrayAtMostOne(rows);

      const [row] = rows;
      return row;
    });
  }
}
