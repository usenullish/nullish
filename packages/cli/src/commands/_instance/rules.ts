import { logHelpInstanceRules } from "../../help/instance/rules/help";
import { logHelpInstanceRulesShow } from "../../help/instance/rules/show.help";
import { logHelpInstanceRulesUpdate } from "../../help/instance/rules/update.help";
import { error } from "../../utils/log";
import { instanceRulesShow } from "./_rules/show";
import { instanceRulesUpdate } from "./_rules/update";

export const instanceRules = async (args?: string[]) => {
  const [, subSubCommand] = args ?? [];

  switch (subSubCommand) {
    case "show":
      await instanceRulesShow(args);
      break;
    case "update":
      await instanceRulesUpdate(args);
      break;

    default:
      error("Unknown subcommand.");
      logHelpInstanceRules();
  }
};

export const helpInstanceRules = (args?: string[]) => {
  const [, subSubCommand] = args ?? [];

  switch (subSubCommand) {
    case "show":
      logHelpInstanceRulesShow();
      break;
    case "update":
      logHelpInstanceRulesUpdate();
      break;

    default:
      logHelpInstanceRules();
  }
};
