import { logHelpSubscription } from "../help/subscription/help";
import { logHelpSubscriptionBootstrap } from "../help/subscription/bootstrap.help";
import { error } from "../utils/log";
import { subscriptionBootstrap } from "./_subscription/bootstrap";
import { helpSubscriptionPlan, subscriptionPlan } from "./_subscription/plan";
import { helpSubscriptionProduct, subscriptionProduct } from "./_subscription/product";
import { helpSubscriptionSettings, subscriptionSettings } from "./_subscription/settings";
import { helpSubscriptionTaxRate, subscriptionTaxRate } from "./_subscription/tax-rate";

export const subscription = async (args?: string[]) => {
  const [subCommand] = args ?? [];

  switch (subCommand) {
    case "bootstrap":
      await subscriptionBootstrap(args);
      break;
    case "plan":
      await subscriptionPlan(args);
      break;
    case "product":
      await subscriptionProduct(args);
      break;
    case "settings":
      await subscriptionSettings(args);
      break;
    case "tax-rate":
      await subscriptionTaxRate(args);
      break;

    default:
      error("Unknown subcommand.");
      logHelpSubscription();
  }
};

export const helpSubscription = (args?: string[]) => {
  const [subCommand] = args ?? [];

  switch (subCommand) {
    case "bootstrap":
      logHelpSubscriptionBootstrap();
      break;
    case "plan":
      helpSubscriptionPlan(args);
      break;
    case "product":
      helpSubscriptionProduct(args);
      break;
    case "settings":
      helpSubscriptionSettings(args);
      break;
    case "tax-rate":
      helpSubscriptionTaxRate(args);
      break;

    default:
      logHelpSubscription();
  }
};
