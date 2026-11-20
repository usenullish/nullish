import { logHelpSubscriptionProduct } from "../../help/subscription/product/help";
import { logHelpSubscriptionProductCreate } from "../../help/subscription/product/create.help";
import { logHelpSubscriptionProductDelete } from "../../help/subscription/product/delete.help";
import { logHelpSubscriptionProductList } from "../../help/subscription/product/list.help";
import { error } from "../../utils/log";
import { subscriptionProductCreate } from "./_product/create";
import { subscriptionProductDelete } from "./_product/delete";
import { subscriptionProductList } from "./_product/list";

export const subscriptionProduct = async (args?: string[]) => {
  const [, subSubCommand] = args ?? [];

  switch (subSubCommand) {
    case "list":
      await subscriptionProductList(args);
      break;
    case "create":
      await subscriptionProductCreate(args);
      break;
    case "delete":
      await subscriptionProductDelete(args);
      break;

    default:
      error("Unknown subcommand.");
      logHelpSubscriptionProduct();
  }
};

export const helpSubscriptionProduct = (args?: string[]) => {
  const [, subSubCommand] = args ?? [];

  switch (subSubCommand) {
    case "list":
      logHelpSubscriptionProductList();
      break;
    case "create":
      logHelpSubscriptionProductCreate();
      break;
    case "delete":
      logHelpSubscriptionProductDelete();
      break;

    default:
      logHelpSubscriptionProduct();
  }
};
