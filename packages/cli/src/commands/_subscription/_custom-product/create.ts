import { intro, isCancel, log, note, select, text } from "@clack/prompts";
import { CustomProductsService } from "@usenullish/nullish-admin/subscription";
import { isArrayAtLeastOne, isEmptyString } from "@usenullish/nullish-common";
import { SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { withDbContext } from "../../../db";
import { lime } from "../../../utils/colors";
import { cancel, exit } from "../../../utils/exit";
import { listPlans, planLabel } from "../_plan/_plans";

export const subscriptionCustomProductCreate = async (_args?: string[]) => {
  console.log();
  intro(lime("nullish"));

  await withDbContext(async (dbContext) => {
    const plans = (await listPlans({ dbContext })).filter(
      ({ provider }) => provider === SubscriptionProvider.CUSTOM,
    );

    if (!isArrayAtLeastOne(plans)) {
      log.info("There is no custom plan.");
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

    const name = await text({
      message: "What is the name of the product?",
      placeholder: "e.g. On-prem",
      validate: (input) => (isEmptyString(input) ? "Enter the name of the product." : undefined),
    });

    if (isCancel(name)) {
      cancel();
    }

    const contactUrl = await text({
      message: "Where can people get in touch for this product?",
      placeholder: "e.g. https://example.com/contact",
      validate: (input) => (URL.canParse(input ?? "") ? undefined : "Enter a URL."),
    });

    if (isCancel(contactUrl)) {
      cancel();
    }

    const result = await CustomProductsService.create({ db: dbContext.connection }).insert({
      customProduct: { planId, provider, name, contactUrl },
    });

    if (result.status === "error") {
      exit({
        msg: `Cannot create the product of the plan ${planId}.`,
        err: result.err,
      });
    }

    note(`${planLabel(plan)} → ${name} (${contactUrl})`, "Product created.");
  });
};
