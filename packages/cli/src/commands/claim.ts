import { logHelpClaim } from "../help/claim/help";
import { logHelpClaimCreate } from "../help/claim/create.help";
import { logHelpClaimDisable } from "../help/claim/disable.help";
import { logHelpClaimList } from "../help/claim/list.help";
import { error } from "../utils/log";
import { claimCreate } from "./_claim/create";
import { claimDisable } from "./_claim/disable";
import { claimList } from "./_claim/list";

export const claim = async (args?: string[]) => {
  const [subCommand] = args ?? [];

  switch (subCommand) {
    case "list":
      await claimList(args);
      break;
    case "create":
      await claimCreate(args);
      break;
    case "disable":
      await claimDisable(args);
      break;

    default:
      error("Unknown subcommand.");
      logHelpClaim();
  }
};

export const helpClaim = (args?: string[]) => {
  const [subCommand] = args ?? [];

  switch (subCommand) {
    case "list":
      logHelpClaimList();
      break;
    case "create":
      logHelpClaimCreate();
      break;
    case "disable":
      logHelpClaimDisable();
      break;

    default:
      logHelpClaim();
  }
};
