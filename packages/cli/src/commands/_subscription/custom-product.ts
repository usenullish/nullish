import { logHelpSubscriptionCustomProduct } from "../../help/subscription/custom-product/help";
import { logHelpSubscriptionCustomProductCreate } from "../../help/subscription/custom-product/create.help";
import { logHelpSubscriptionCustomProductDelete } from "../../help/subscription/custom-product/delete.help";
import { logHelpSubscriptionCustomProductList } from "../../help/subscription/custom-product/list.help";
import { error } from "../../utils/log";
import { subscriptionCustomProductCreate } from "./_custom-product/create";
import { subscriptionCustomProductDelete } from "./_custom-product/delete";
import { subscriptionCustomProductList } from "./_custom-product/list";

export const subscriptionCustomProduct = async (args?: string[]) => {
  const [, subSubCommand] = args ?? [];

  switch (subSubCommand) {
    case "list":
      await subscriptionCustomProductList(args);
      break;
    case "create":
      await subscriptionCustomProductCreate(args);
      break;
    case "delete":
      await subscriptionCustomProductDelete(args);
      break;

    default:
      error("Unknown subcommand.");
      logHelpSubscriptionCustomProduct();
  }
};

export const helpSubscriptionCustomProduct = (args?: string[]) => {
  const [, subSubCommand] = args ?? [];

  switch (subSubCommand) {
    case "list":
      logHelpSubscriptionCustomProductList();
      break;
    case "create":
      logHelpSubscriptionCustomProductCreate();
      break;
    case "delete":
      logHelpSubscriptionCustomProductDelete();
      break;

    default:
      logHelpSubscriptionCustomProduct();
  }
};
