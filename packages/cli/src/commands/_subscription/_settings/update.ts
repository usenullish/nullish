import { intro, isCancel, note, select, text } from "@clack/prompts";
import { SubscriptionSettingsService } from "@usenullish/nullish-admin/subscription";
import { isNullish } from "@usenullish/nullish-common";
import { SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { withDbContext } from "../../../db";
import { lime } from "../../../utils/colors";
import { cancel, exit } from "../../../utils/exit";
import { planLabel, listPlans } from "../_plan/_plans";
import { getSubscriptionSettings, settingsLabel } from "./_settings";

export const subscriptionSettingsUpdate = async (_args?: string[]) => {
  console.log();
  intro(lime("nullish"));

  await withDbContext(async (dbContext) => {
    const { initialPlanId, graceDays } = await getSubscriptionSettings({ dbContext });

    const plans = await listPlans({ dbContext });

    const newInitialPlanId = await select({
      message: "Which plan should newly created organizations be subscribed to?",
      options: plans
        .filter(({ provider }) => provider === SubscriptionProvider.SELF)
        .map((plan) => ({ label: planLabel(plan), value: plan.id })),
      initialValue: initialPlanId,
    });

    if (isCancel(newInitialPlanId)) {
      cancel();
    }

    const newGraceDays = await text({
      message: "How many days can a subscription remain active if no payment arrives?",
      defaultValue: String(graceDays),
      placeholder: String(graceDays),
      validate: (input) =>
        /^\d*$/.test(input ?? "") ? undefined : "Enter a number of days, 0 or more.",
    });

    if (isCancel(newGraceDays)) {
      cancel();
    }

    const result = await SubscriptionSettingsService.create({ db: dbContext.connection }).update({
      settings: { initialPlanId: newInitialPlanId, graceDays: Number(newGraceDays) },
    });

    if (result.status === "error") {
      exit({ msg: "Cannot update the subscription settings.", err: result.err });
    }

    if (isNullish(result.result)) {
      exit({ msg: "The subscription settings are missing." });
    }

    note(settingsLabel(result.result), "Subscription settings updated.");
  });
};
