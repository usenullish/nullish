import { logHelpSubscriptionExternalProduct } from "../../help/subscription/external-product/help";
import { logHelpSubscriptionExternalProductCreate } from "../../help/subscription/external-product/create.help";
import { logHelpSubscriptionExternalProductDelete } from "../../help/subscription/external-product/delete.help";
import { logHelpSubscriptionExternalProductList } from "../../help/subscription/external-product/list.help";
import { error } from "../../utils/log";
import { subscriptionExternalProductCreate } from "./_external-product/create";
import { subscriptionExternalProductDelete } from "./_external-product/delete";
import { subscriptionExternalProductList } from "./_external-product/list";

export const subscriptionExternalProduct = async (args?: string[]) => {
  const [, subSubCommand] = args ?? [];

  switch (subSubCommand) {
    case "list":
      await subscriptionExternalProductList(args);
      break;
    case "create":
      await subscriptionExternalProductCreate(args);
      break;
    case "delete":
      await subscriptionExternalProductDelete(args);
      break;

    default:
      error("Unknown subcommand.");
      logHelpSubscriptionExternalProduct();
  }
};

export const helpSubscriptionExternalProduct = (args?: string[]) => {
  const [, subSubCommand] = args ?? [];

  switch (subSubCommand) {
    case "list":
      logHelpSubscriptionExternalProductList();
      break;
    case "create":
      logHelpSubscriptionExternalProductCreate();
      break;
    case "delete":
      logHelpSubscriptionExternalProductDelete();
      break;

    default:
      logHelpSubscriptionExternalProduct();
  }
};
