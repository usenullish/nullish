import { cyan, lime, magenta, yellow } from "../../utils/colors";
import {
  OPTION_HELP,
  ORGANIZATION_DELETE_DESCRIPTION,
  ORGANIZATION_DESCRIPTION,
  TITLE_AND_VERSION,
} from "../../_constants";
import { log } from "../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("organization")} ${magenta("<subcommand>")} ${yellow("[options]")}

Commands:
  ${cyan("delete")}              ${ORGANIZATION_DELETE_DESCRIPTION}

Options:
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${ORGANIZATION_DESCRIPTION}

${usage}
`;

export const logHelpOrganization = () => log(help);
