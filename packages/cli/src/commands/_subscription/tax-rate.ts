import { logHelpSubscriptionTaxRate } from "../../help/subscription/tax-rate/help";
import { logHelpSubscriptionTaxRateCreate } from "../../help/subscription/tax-rate/create.help";
import { logHelpSubscriptionTaxRateDisable } from "../../help/subscription/tax-rate/disable.help";
import { logHelpSubscriptionTaxRateList } from "../../help/subscription/tax-rate/list.help";
import { error } from "../../utils/log";
import { subscriptionTaxRateCreate } from "./_tax-rate/create";
import { subscriptionTaxRateDisable } from "./_tax-rate/disable";
import { subscriptionTaxRateList } from "./_tax-rate/list";

export const subscriptionTaxRate = async (args?: string[]) => {
  const [, subSubCommand] = args ?? [];

  switch (subSubCommand) {
    case "list":
      await subscriptionTaxRateList(args);
      break;
    case "create":
      await subscriptionTaxRateCreate(args);
      break;
    case "disable":
      await subscriptionTaxRateDisable(args);
      break;

    default:
      error("Unknown subcommand.");
      logHelpSubscriptionTaxRate();
  }
};

export const helpSubscriptionTaxRate = (args?: string[]) => {
  const [, subSubCommand] = args ?? [];

  switch (subSubCommand) {
    case "list":
      logHelpSubscriptionTaxRateList();
      break;
    case "create":
      logHelpSubscriptionTaxRateCreate();
      break;
    case "disable":
      logHelpSubscriptionTaxRateDisable();
      break;

    default:
      logHelpSubscriptionTaxRate();
  }
};
