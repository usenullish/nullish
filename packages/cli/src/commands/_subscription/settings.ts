import { logHelpSubscriptionSettings } from "../../help/subscription/settings/help";
import { logHelpSubscriptionSettingsShow } from "../../help/subscription/settings/show.help";
import { logHelpSubscriptionSettingsUpdate } from "../../help/subscription/settings/update.help";
import { error } from "../../utils/log";
import { subscriptionSettingsShow } from "./_settings/show";
import { subscriptionSettingsUpdate } from "./_settings/update";

export const subscriptionSettings = async (args?: string[]) => {
  const [, subSubCommand] = args ?? [];

  switch (subSubCommand) {
    case "show":
      await subscriptionSettingsShow(args);
      break;
    case "update":
      await subscriptionSettingsUpdate(args);
      break;

    default:
      error("Unknown subcommand.");
      logHelpSubscriptionSettings();
  }
};

export const helpSubscriptionSettings = (args?: string[]) => {
  const [, subSubCommand] = args ?? [];

  switch (subSubCommand) {
    case "show":
      logHelpSubscriptionSettingsShow();
      break;
    case "update":
      logHelpSubscriptionSettingsUpdate();
      break;

    default:
      logHelpSubscriptionSettings();
  }
};
