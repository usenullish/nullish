import { logHelpSubscriptionTaxRate } from "../../help/subscription/tax-rate/help";
import { logHelpSubscriptionTaxRateCreate } from "../../help/subscription/tax-rate/create.help";
import { logHelpSubscriptionTaxRateEnd } from "../../help/subscription/tax-rate/end.help";
import { logHelpSubscriptionTaxRateList } from "../../help/subscription/tax-rate/list.help";
import { error } from "../../utils/log";
import { subscriptionTaxRateCreate } from "./_tax-rate/create";
import { subscriptionTaxRateEnd } from "./_tax-rate/end";
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
    case "end":
      await subscriptionTaxRateEnd(args);
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
    case "end":
      logHelpSubscriptionTaxRateEnd();
      break;

    default:
      logHelpSubscriptionTaxRate();
  }
};
