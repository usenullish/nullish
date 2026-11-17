import { logHelpSubscription } from "../help/subscription/help";
import { error } from "../utils/log";
import { helpSubscriptionSettings, subscriptionSettings } from "./_subscription/settings";

export const subscription = async (args?: string[]) => {
  const [subCommand] = args ?? [];

  switch (subCommand) {
    case "settings":
      await subscriptionSettings(args);
      break;

    default:
      error("Unknown subcommand.");
      logHelpSubscription();
  }
};

export const helpSubscription = (args?: string[]) => {
  const [subCommand] = args ?? [];

  switch (subCommand) {
    case "settings":
      helpSubscriptionSettings(args);
      break;

    default:
      logHelpSubscription();
  }
};
