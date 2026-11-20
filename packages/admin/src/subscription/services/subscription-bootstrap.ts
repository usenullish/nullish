import * as z from "zod";
import {
  assertNonNullish,
  BigIntCodec,
  DateCodec,
  isArrayExactlyOne,
  nonNullish,
  NotEmptyStringSchema,
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
  SubscriptionSettingsSchema: { UpdateSubscriptionSettingsSchema },
} = RecordsSchema.Subscription;

const BootstrapPlanBaseSchema = z.strictObject({
  key: NotEmptyStringSchema,
  trialDays: InsertPlansSchema.shape.trialDays,
});

const BootstrapPlanSchema = z.discriminatedUnion("provider", [
  BootstrapPlanBaseSchema.extend({
    provider: z.literal(SubscriptionProvider.SELF),
  }),
  BootstrapPlanBaseSchema.extend({
    provider: z.literal(SubscriptionProvider.CUSTOM),
    product: InsertCustomProductsSchema.pick({ name: true, contactUrl: true }),
    prices: z
      .array(
        InsertCustomPricesSchema.pick({ currency: true, billingPeriod: true }).extend({
          amount: BigIntCodec,
        }),
      )
      .default([]),
  }),
]);

const BootstrapProviderSchema = z.strictObject({
  provider: z.enum(SubscriptionProvider).exclude(["SELF", "CUSTOM"]),
  plans: z
    .array(
      BootstrapPlanBaseSchema.extend({
        externalProductId: InsertExternalProductsSchema.shape.externalProductId,
      }),
    )
    .default([]),
  taxRates: z
    .array(
      InsertSubscriptionTaxRatesSchema.pick({ externalTaxRateId: true }).extend({
        startOn: DateCodec,
        endOn: DateCodec.nullish(),
      }),
    )
    .default([]),
});

const planKeysOf = ({
  plans,
  providers,
}: {
  plans: Pick<BootstrapPlan, "key">[];
  providers: { plans: Pick<BootstrapPlan, "key">[] }[];
}): BootstrapPlan["key"][] =>
  [...plans, ...providers.flatMap((provider) => provider.plans)].map(({ key }) => key);

export const SubscriptionBootstrapSchema = z
  .strictObject({
    plans: z.array(BootstrapPlanSchema).default([]),
    providers: z.array(BootstrapProviderSchema).default([]),
    settings: z.strictObject({
      initialPlan: BootstrapPlanBaseSchema.shape.key,
      graceDays: UpdateSubscriptionSettingsSchema.shape.graceDays,
    }),
  })
  .refine(
    (setup) => {
      const keys = planKeysOf(setup);
      return new Set(keys).size === keys.length;
    },
    { message: "Every plan needs its own key.", path: ["plans"] },
  )
  .refine((setup) => planKeysOf(setup).includes(setup.settings.initialPlan), {
    message: "The initial plan is not one of the plans.",
    path: ["settings", "initialPlan"],
  });

export type SubscriptionBootstrap = z.input<typeof SubscriptionBootstrapSchema>;

type BootstrapPlan = z.output<typeof BootstrapPlanSchema>;
type BootstrapProvider = z.output<typeof BootstrapProviderSchema>;
type Plan = Records["Subscription"]["Plans"]["Select"];
type SeededPlan = { key: BootstrapPlan["key"]; plan: Plan };

export class SubscriptionBootstrapService extends AdminServiceContext {
  private constructor(args: AdminServiceContextArgs) {
    super(args);
  }

  static create(args: { db: PostgresDbInstance }): SubscriptionBootstrapService {
    return new this(args);
  }

  bootstrap({ setup }: { setup: SubscriptionBootstrap }): Promise<Result<void>> {
    return this._withDbContext(async (tx) => {
      const { plans, providers, settings } = SubscriptionBootstrapSchema.parse(setup);

      const defaultPlan = await this.#findAndAssertDefaultPlan({ tx });

      await disablePlan({ tx, planId: defaultPlan.id });

      const seeded: SeededPlan[] = [];

      for (const plan of plans) {
        seeded.push(await this.#seedPlan({ tx, plan }));
      }

      for (const provider of providers) {
        seeded.push(...(await this.#seedProvider({ tx, provider })));
      }

      const initialPlan = seeded.find(({ key }) => key === settings.initialPlan);

      assertNonNullish(initialPlan);

      await updateSubscriptionSettings({
        tx,
        settings: { initialPlanId: initialPlan.plan.id, graceDays: settings.graceDays },
      });
    });
  }

  async #seedProvider({
    tx,
    provider: { provider, plans, taxRates },
  }: {
    tx: Tx;
    provider: BootstrapProvider;
  }): Promise<SeededPlan[]> {
    const seeded: SeededPlan[] = [];

    for (const { key, trialDays, externalProductId } of plans) {
      const plan = await insertPlan({ tx, plan: { provider, trialDays } });

      await insertExternalProduct({
        tx,
        externalProduct: { planId: plan.id, provider, externalProductId },
      });

      seeded.push({ key, plan });
    }

    for (const taxRate of taxRates) {
      await insertSubscriptionTaxRate({ tx, taxRate: { provider, ...taxRate } });
    }

    return seeded;
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

  async #seedPlan({ tx, plan }: { tx: Tx; plan: BootstrapPlan }): Promise<SeededPlan> {
    const { key, provider, trialDays } = plan;

    const row = await insertPlan({ tx, plan: { provider, trialDays } });

    await this.#seedProduct({ tx, planId: row.id, plan });

    return { key, plan: row };
  }

  async #seedProduct({
    tx,
    planId,
    plan,
  }: {
    tx: Tx;
    planId: Plan["id"];
    plan: BootstrapPlan;
  }): Promise<void> {
    if (plan.provider === SubscriptionProvider.SELF) {
      return;
    }

    const { provider, product, prices } = plan;

    const { id: productId } = await insertCustomProduct({
      tx,
      customProduct: { planId, provider, ...product },
    });

    for (const price of prices) {
      await insertCustomPrice({ tx, customPrice: { productId, ...price } });
    }
  }
}
