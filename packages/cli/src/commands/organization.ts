import { logHelpOrganization } from "../help/organization/help";
import { logHelpOrganizationDelete } from "../help/organization/delete.help";
import { error } from "../utils/log";
import { organizationDelete } from "./_organization/delete";

export const organization = async (args?: string[]) => {
  const [subCommand] = args ?? [];

  switch (subCommand) {
    case "delete":
      await organizationDelete(args);
      break;

    default:
      error("Unknown subcommand.");
      logHelpOrganization();
  }
};

export const helpOrganization = (args?: string[]) => {
  const [subCommand] = args ?? [];

  switch (subCommand) {
    case "delete":
      logHelpOrganizationDelete();
      break;

    default:
      logHelpOrganization();
  }
};
