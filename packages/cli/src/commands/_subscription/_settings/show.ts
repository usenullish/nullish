import { intro, note } from "@clack/prompts";
import { withDbContext } from "../../../db";
import { lime } from "../../../utils/colors";
import { getSubscriptionSettings, settingsLabel } from "./_settings";

export const subscriptionSettingsShow = async (_args?: string[]) => {
  console.log();
  intro(lime("nullish"));

  await withDbContext(async (dbContext) => {
    const settings = await getSubscriptionSettings({ dbContext });

    note(settingsLabel(settings), "Subscription settings");
  });
};
