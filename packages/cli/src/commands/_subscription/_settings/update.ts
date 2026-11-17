import { intro, isCancel, note, select, text } from "@clack/prompts";
import { SubscriptionSettingsService } from "@usenullish/nullish-admin/subscription";
import { isNullish } from "@usenullish/nullish-common";
import { withDbContext } from "../../../db";
import { lime } from "../../../utils/colors";
import { cancel, exit } from "../../../utils/exit";
import { claimLabel, listClaims } from "../../_claim/_claims";
import { getSubscriptionSettings, settingsLabel } from "./_settings";

export const subscriptionSettingsUpdate = async (_args?: string[]) => {
  console.log();
  intro(lime("nullish"));

  await withDbContext(async (dbContext) => {
    const { initialClaimId, graceDays } = await getSubscriptionSettings({ dbContext });

    const claims = await listClaims({ dbContext });

    const newInitialClaimId = await select({
      message: "Which claim should newly created organizations be subscribed to?",
      options: claims.map((claim) => ({ label: claimLabel(claim), value: claim.id })),
      initialValue: initialClaimId,
    });

    if (isCancel(newInitialClaimId)) {
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
      settings: { initialClaimId: newInitialClaimId, graceDays: Number(newGraceDays) },
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
