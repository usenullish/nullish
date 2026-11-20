import { intro, isCancel, log, note, select } from "@clack/prompts";
import { PlansService } from "@usenullish/nullish-admin/subscription";
import { isArrayAtLeastOne, isNullish } from "@usenullish/nullish-common";
import { withDbContext } from "../../../db";
import { lime } from "../../../utils/colors";
import { cancel, exit } from "../../../utils/exit";
import { planLabel, listPlans } from "./_plans";

export const subscriptionPlanDisable = async (_args?: string[]) => {
  console.log();
  intro(lime("nullish"));

  await withDbContext(async (dbContext) => {
    const plans = await listPlans({ dbContext });

    if (!isArrayAtLeastOne(plans)) {
      log.info("There is no plan.");
      return;
    }

    const planId = await select({
      message: "Which plan should no longer be given?",
      options: plans.map((plan) => ({ label: planLabel(plan), value: plan.id })),
    });

    if (isCancel(planId)) {
      cancel();
    }

    const result = await PlansService.create({ db: dbContext.connection }).update({
      planId,
      plan: { expiresAt: new Date() },
    });

    if (result.status === "error") {
      exit({
        msg: `Cannot disable the plan ${planId}.`,
        err: result.err,
      });
    }

    if (isNullish(result.result)) {
      exit({ msg: `The plan ${planId} was not found.` });
    }

    note(planLabel(result.result), "Plan disabled.");
  });
};
