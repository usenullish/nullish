import { intro, isCancel, note, text } from "@clack/prompts";
import { ExternalProductsService, PlansService } from "@usenullish/nullish-admin/subscription";
import { isEmptyString, isNullish } from "@usenullish/nullish-common";
import { withDbContext } from "../../db";
import { lime } from "../../utils/colors";
import { cancel, exit } from "../../utils/exit";
import { planLabel, promptPlanExpiresAt, promptPlanProduct } from "./_plans";

export const planCreate = async (_args?: string[]) => {
  console.log();
  intro(lime("nullish"));

  const trialDays = await text({
    message: "How many days does the trial of a new subscription last?",
    placeholder: "e.g. 14, empty for no end",
    validate: (input) =>
      isEmptyString(input) || /^[1-9]\d*$/.test(input ?? "")
        ? undefined
        : "Enter a number of days, at least 1.",
  });

  if (isCancel(trialDays)) {
    cancel();
  }

  const expiresAt = await promptPlanExpiresAt({ message: "Until when can the plan be given?" });

  const { provider, externalProductId } = await promptPlanProduct();

  await withDbContext(async (dbContext) => {
    const result = await PlansService.create({ db: dbContext.connection }).insert({
      plan: {
        trialDays: isEmptyString(trialDays) ? null : Number(trialDays),
        expiresAt: expiresAt ?? null,
        provider,
      },
    });

    if (result.status === "error") {
      exit({
        msg: "Cannot create the plan.",
        err: result.err,
      });
    }

    note(planLabel(result.result), "Plan created.");

    if (isNullish(externalProductId)) {
      return;
    }

    const productResult = await ExternalProductsService.create({
      db: dbContext.connection,
    }).insert({
      externalProduct: { planId: result.result.id, provider, externalProductId },
    });

    if (productResult.status === "error") {
      exit({
        msg: "Cannot link the plan to its product.",
        err: productResult.err,
      });
    }

    note(externalProductId, "Product linked.");
  });
};
