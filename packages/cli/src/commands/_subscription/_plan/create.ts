import { intro, isCancel, note, text } from "@clack/prompts";
import { PlansService } from "@usenullish/nullish-admin/subscription";
import { isEmptyString, type Nullable } from "@usenullish/nullish-common";
import { SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { withDbContext } from "../../../db";
import { lime } from "../../../utils/colors";
import { cancel, exit } from "../../../utils/exit";
import { planLabel, promptPlanExpiresAt, promptPlanProvider } from "./_plans";

const promptPlanTrialDays = async (): Promise<Nullable<number>> => {
  const trialDays = await text({
    message: "How many days does the trial of a new subscription last?",
    placeholder: "e.g. 14, empty for no trial",
    validate: (input) =>
      isEmptyString(input) || /^[1-9]\d*$/.test(input ?? "")
        ? undefined
        : "Enter a number of days, at least 1.",
  });

  if (isCancel(trialDays)) {
    cancel();
  }

  return isEmptyString(trialDays) ? null : Number(trialDays);
};

export const subscriptionPlanCreate = async (_args?: string[]) => {
  console.log();
  intro(lime("nullish"));

  const provider = await promptPlanProvider();

  const trialDays = provider === SubscriptionProvider.SELF ? await promptPlanTrialDays() : null;

  const expiresAt = await promptPlanExpiresAt({ message: "Until when can the plan be given?" });

  await withDbContext(async (dbContext) => {
    const result = await PlansService.create({ db: dbContext.connection }).insert({
      plan: {
        trialDays,
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
  });
};
