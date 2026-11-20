import * as z from "zod";
import {
  assertNonNullish,
  BigIntCodec,
  DateCodec,
  isArrayExactlyOne,
  nonNullish,
  type Result,
} from "@usenullish/nullish-common";
import type { Tx } from "@usenullish/nullish-db";
import { type PostgresDbInstance, SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { type Records, RecordsSchema } from "@usenullish/nullish-schema/records";
import { AdminServiceContext, type AdminServiceContextArgs } from "../../_service";
import { insertCustomPrice } from "../_helpers/custom-prices";
import { insertCustomProduct } from "../_helpers/custom-products";
import { insertExternalProduct } from "../_helpers/external-products";
import { disablePlan, insertPlan, listPlans } from "../_helpers/plans";
import { updateSubscriptionSettings } from "../_helpers/subscription-settings";
import { insertSubscriptionTaxRate } from "../_helpers/subscription-tax-rates";

const {
  PlansSchema: { InsertPlansSchema },
  ExternalProductsSchema: { InsertExternalProductsSchema },
  CustomProductsSchema: { InsertCustomProductsSchema },
  CustomPricesSchema: { InsertCustomPricesSchema },
  SubscriptionTaxRatesSchema: { InsertSubscriptionTaxRatesSchema },
} = RecordsSchema.Subscription;

const ExternalProviderSchema = z.enum(SubscriptionProvider).exclude(["SELF", "CUSTOM"]);

const BootstrapSelfPlanSchema = z.strictObject({
  provider: z.literal(SubscriptionProvider.SELF),
  trialDays: InsertPlansSchema.shape.trialDays,
});

const BootstrapCustomPlanSchema = z.strictObject({
  provider: z.literal(SubscriptionProvider.CUSTOM),
  name: InsertCustomProductsSchema.shape.name,
  contactUrl: InsertCustomProductsSchema.shape.contactUrl,
  prices: z
    .array(
      InsertCustomPricesSchema.pick({ currency: true, billingPeriod: true }).extend({
        amount: BigIntCodec,
      }),
    )
    .default([]),
});

const BootstrapExternalPlanSchema = z.strictObject({
  provider: ExternalProviderSchema,
  trialDays: InsertPlansSchema.shape.trialDays,
  externalProductId: InsertExternalProductsSchema.shape.externalProductId,
  name: InsertExternalProductsSchema.shape.name,
  taxRates: z
    .array(
      InsertSubscriptionTaxRatesSchema.pick({ externalTaxRateId: true }).extend({
        startOn: DateCodec,
        endOn: DateCodec.nullish(),
      }),
    )
    .default([]),
});

const BootstrapPlanSchema = z.discriminatedUnion("provider", [
  BootstrapSelfPlanSchema,
  BootstrapCustomPlanSchema,
  BootstrapExternalPlanSchema,
]);

export const SubscriptionBootstrapSchema = z
  .array(BootstrapPlanSchema)
  .refine(
    (plans) => plans.filter(({ provider }) => provider === SubscriptionProvider.SELF).length === 1,
    { message: "Exactly one self plan is required, the initial plan." },
  );

export type SubscriptionBootstrap = z.input<typeof SubscriptionBootstrapSchema>;

type BootstrapPlan = z.output<typeof BootstrapPlanSchema>;
type BootstrapCustomPlan = z.output<typeof BootstrapCustomPlanSchema>;
type BootstrapExternalPlan = z.output<typeof BootstrapExternalPlanSchema>;
type Plan = Records["Subscription"]["Plans"]["Select"];

export class SubscriptionBootstrapService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): SubscriptionBootstrapService {
    return new this(args);
  }

  bootstrap({ setup }: { setup: SubscriptionBootstrap }): Promise<Result<void>> {
    return this._withDbContext(async (tx) => {
      const plans = SubscriptionBootstrapSchema.parse(setup);

      const defaultPlan = await this.#findAndAssertDefaultPlan({ tx });

      await disablePlan({ tx, planId: defaultPlan.id });

      const seeded: Plan[] = [];

      for (const plan of plans) {
        seeded.push(await this.#seedPlan({ tx, plan }));
      }

      const initialPlan = seeded.find(({ provider }) => provider === SubscriptionProvider.SELF);

      assertNonNullish(initialPlan);

      await updateSubscriptionSettings({
        tx,
        settings: { initialPlanId: initialPlan.id },
      });
    });
  }

  async #findAndAssertDefaultPlan({ tx }: { tx: Tx }): Promise<Plan> {
    const plans = await listPlans({ tx });

    if (!isArrayExactlyOne(plans)) {
      throw new Error(
        `The subscription is already set up: ${plans.length} plans exist instead of the default one.`,
      );
    }

    const [plan] = plans;
    const { provider, trialDays, expiresAt } = plan;

    if (provider !== SubscriptionProvider.SELF || nonNullish(trialDays) || nonNullish(expiresAt)) {
      throw new Error(
        `The subscription is already set up: plan ${plan.id} is not the default one.`,
      );
    }

    return plan;
  }

  async #seedPlan({ tx, plan }: { tx: Tx; plan: BootstrapPlan }): Promise<Plan> {
    switch (plan.provider) {
      case SubscriptionProvider.SELF:
        return await insertPlan({ tx, plan });
      case SubscriptionProvider.CUSTOM:
        return await this.#seedCustomPlan({ tx, plan });
      default:
        return await this.#seedExternalPlan({ tx, plan });
    }
  }

  async #seedCustomPlan({
    tx,
    plan: { provider, name, contactUrl, prices },
  }: {
    tx: Tx;
    plan: BootstrapCustomPlan;
  }): Promise<Plan> {
    const plan = await insertPlan({ tx, plan: { provider } });

    const { id: productId } = await insertCustomProduct({
      tx,
      customProduct: { planId: plan.id, provider, name, contactUrl },
    });

    for (const price of prices) {
      await insertCustomPrice({ tx, customPrice: { productId, ...price } });
    }

    return plan;
  }

  async #seedExternalPlan({
    tx,
    plan: { provider, trialDays, externalProductId, name, taxRates },
  }: {
    tx: Tx;
    plan: BootstrapExternalPlan;
  }): Promise<Plan> {
    const plan = await insertPlan({ tx, plan: { provider, trialDays } });

    await insertExternalProduct({
      tx,
      externalProduct: { planId: plan.id, provider, externalProductId, name },
    });

    for (const taxRate of taxRates) {
      await insertSubscriptionTaxRate({ tx, taxRate: { provider, ...taxRate } });
    }

    return plan;
  }
}
