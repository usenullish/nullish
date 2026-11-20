import { logHelpSubscriptionProduct } from "../../help/subscription/product/help";
import { logHelpSubscriptionProductCreate } from "../../help/subscription/product/create.help";
import { error } from "../../utils/log";
import { subscriptionProductCreate } from "./_product/create";

export const subscriptionProduct = async (args?: string[]) => {
  const [, subSubCommand] = args ?? [];

  switch (subSubCommand) {
    case "create":
      await subscriptionProductCreate(args);
      break;

    default:
      error("Unknown subcommand.");
      logHelpSubscriptionProduct();
  }
};

export const helpSubscriptionProduct = (args?: string[]) => {
  const [, subSubCommand] = args ?? [];

  switch (subSubCommand) {
    case "create":
      logHelpSubscriptionProductCreate();
      break;

    default:
      logHelpSubscriptionProduct();
  }
};
