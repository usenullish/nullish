import { logHelpUser } from "../help/user/help";
import { logHelpUserList } from "../help/user/list.help";
import { error } from "../utils/log";
import { userList } from "./_user/list";

export const user = async (args?: string[]) => {
  const [subCommand] = args ?? [];

  switch (subCommand) {
    case "list":
      await userList(args);
      break;

    default:
      error("Unknown subcommand.");
      logHelpUser();
  }
};

export const helpUser = (args?: string[]) => {
  const [subCommand] = args ?? [];

  switch (subCommand) {
    case "list":
      logHelpUserList();
      break;

    default:
      logHelpUser();
  }
};
