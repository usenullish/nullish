import { isNullish, type Result } from "@usenullish/nullish-common";
import type { PostgresDbInstance, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { AdminServiceContext, type AdminServiceContextArgs } from "./_admin-service";
import { getSubscriptionTaxRate } from "./_helpers/subscription-tax-rates";

type SubscriptionTaxRate = Records["Subscription"]["SubscriptionTaxRates"]["Select"];

export class PaymentInvoiceService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): PaymentInvoiceService {
    return new this(args);
  }

  prepare({
    provider,
    validOn,
  }: {
    provider: SubscriptionProvider;
    validOn: SubscriptionTaxRate["startOn"];
  }): Promise<Result<{ externalTaxRateId: SubscriptionTaxRate["externalTaxRateId"] }>> {
    return this._withDbContext(async (tx) => {
      const taxRate = await getSubscriptionTaxRate({ tx, provider, validOn });

      if (isNullish(taxRate)) {
        throw new Error(
          `No ${provider} tax rate is valid on ${validOn.toISOString().slice(0, 10)}.`,
        );
      }

      return { externalTaxRateId: taxRate.externalTaxRateId };
    });
  }
}
