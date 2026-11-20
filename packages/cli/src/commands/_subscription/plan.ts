import { logHelpSubscriptionPlan } from "../../help/subscription/plan/help";
import { logHelpSubscriptionPlanCreate } from "../../help/subscription/plan/create.help";
import { logHelpSubscriptionPlanDisable } from "../../help/subscription/plan/disable.help";
import { logHelpSubscriptionPlanList } from "../../help/subscription/plan/list.help";
import { error } from "../../utils/log";
import { subscriptionPlanCreate } from "./_plan/create";
import { subscriptionPlanDisable } from "./_plan/disable";
import { subscriptionPlanList } from "./_plan/list";

export const subscriptionPlan = async (args?: string[]) => {
  const [, subSubCommand] = args ?? [];

  switch (subSubCommand) {
    case "list":
      await subscriptionPlanList(args);
      break;
    case "create":
      await subscriptionPlanCreate(args);
      break;
    case "disable":
      await subscriptionPlanDisable(args);
      break;

    default:
      error("Unknown subcommand.");
      logHelpSubscriptionPlan();
  }
};

export const helpSubscriptionPlan = (args?: string[]) => {
  const [, subSubCommand] = args ?? [];

  switch (subSubCommand) {
    case "list":
      logHelpSubscriptionPlanList();
      break;
    case "create":
      logHelpSubscriptionPlanCreate();
      break;
    case "disable":
      logHelpSubscriptionPlanDisable();
      break;

    default:
      logHelpSubscriptionPlan();
  }
};
