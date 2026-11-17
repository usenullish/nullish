import { intro, isCancel, note, text } from "@clack/prompts";
import { ClaimsService } from "@usenullish/nullish-admin/subscription";
import { isEmptyString } from "@usenullish/nullish-common";
import { withDbContext } from "../../db";
import { lime } from "../../utils/colors";
import { cancel, exit } from "../../utils/exit";
import { claimLabel, promptDate } from "./_claims";

export const claimCreate = async (_args?: string[]) => {
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

  const expiresAt = await promptDate({ message: "Until when can the claim be given?" });

  await withDbContext(async (dbContext) => {
    const result = await ClaimsService.create({ db: dbContext.connection }).insert({
      claim: {
        trialDays: isEmptyString(trialDays) ? null : Number(trialDays),
        expiresAt: expiresAt ?? null,
      },
    });

    if (result.status === "error") {
      exit({
        msg: "Cannot create the claim.",
        err: result.err,
      });
    }

    note(claimLabel(result.result), "Claim created.");
  });
};
