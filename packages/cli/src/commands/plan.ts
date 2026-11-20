import { logHelpPlan } from "../help/plan/help";
import { logHelpPlanCreate } from "../help/plan/create.help";
import { logHelpPlanDisable } from "../help/plan/disable.help";
import { logHelpPlanList } from "../help/plan/list.help";
import { error } from "../utils/log";
import { planCreate } from "./_plan/create";
import { planDisable } from "./_plan/disable";
import { planList } from "./_plan/list";

export const plan = async (args?: string[]) => {
  const [subCommand] = args ?? [];

  switch (subCommand) {
    case "list":
      await planList(args);
      break;
    case "create":
      await planCreate(args);
      break;
    case "disable":
      await planDisable(args);
      break;

    default:
      error("Unknown subcommand.");
      logHelpPlan();
  }
};

export const helpPlan = (args?: string[]) => {
  const [subCommand] = args ?? [];

  switch (subCommand) {
    case "list":
      logHelpPlanList();
      break;
    case "create":
      logHelpPlanCreate();
      break;
    case "disable":
      logHelpPlanDisable();
      break;

    default:
      logHelpPlan();
  }
};
