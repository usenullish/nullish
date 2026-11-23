import { logHelpInstance } from "../help/instance/help";
import { error } from "../utils/log";
import { helpInstanceRules, instanceRules } from "./_instance/rules";

export const instance = async (args?: string[]) => {
  const [subCommand] = args ?? [];

  switch (subCommand) {
    case "rules":
      await instanceRules(args);
      break;

    default:
      error("Unknown subcommand.");
      logHelpInstance();
  }
};

export const helpInstance = (args?: string[]) => {
  const [subCommand] = args ?? [];

  switch (subCommand) {
    case "rules":
      helpInstanceRules(args);
      break;

    default:
      logHelpInstance();
  }
};
