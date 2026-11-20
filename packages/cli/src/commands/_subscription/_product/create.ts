import { intro, isCancel, log, note, select, text } from "@clack/prompts";
import { ExternalProductsService } from "@usenullish/nullish-admin/subscription";
import { isArrayAtLeastOne, isEmptyString } from "@usenullish/nullish-common";
import { SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { withDbContext } from "../../../db";
import { lime } from "../../../utils/colors";
import { cancel, exit } from "../../../utils/exit";
import { listPlans, planLabel } from "../_plan/_plans";

export const subscriptionProductCreate = async (_args?: string[]) => {
  console.log();
  intro(lime("nullish"));

  await withDbContext(async (dbContext) => {
    const plans = (await listPlans({ dbContext })).filter(
      ({ provider }) =>
        ![SubscriptionProvider.SELF, SubscriptionProvider.CUSTOM].includes(provider),
    );

    if (!isArrayAtLeastOne(plans)) {
      log.info("There is no plan of a third-party provider.");
      return;
    }

    const plan = await select({
      message: "Which plan is the product for?",
      options: plans.map((plan) => ({ label: planLabel(plan), value: plan })),
    });

    if (isCancel(plan)) {
      cancel();
    }

    const { id: planId, provider } = plan;

    const externalProductId = await text({
      message: `What is the product ID at ${provider}?`,
      placeholder: "e.g. prod_123",
      validate: (input) => (isEmptyString(input) ? "Enter the ID of the product." : undefined),
    });

    if (isCancel(externalProductId)) {
      cancel();
    }

    const name = await text({
      message: "What is the name of the product?",
      placeholder: "e.g. Cloud",
      validate: (input) => (isEmptyString(input) ? "Enter the name of the product." : undefined),
    });

    if (isCancel(name)) {
      cancel();
    }

    const result = await ExternalProductsService.create({ db: dbContext.connection }).insert({
      externalProduct: { planId, provider, externalProductId, name },
    });

    if (result.status === "error") {
      exit({
        msg: `Cannot create the product of the plan ${planId}.`,
        err: result.err,
      });
    }

    note(`${planLabel(plan)} → ${name} (${externalProductId})`, "Product created.");
  });
};
