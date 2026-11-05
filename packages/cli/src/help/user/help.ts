import { cyan, lime, magenta, yellow } from "../../utils/colors";
import {
  OPTION_HELP,
  TITLE_AND_VERSION,
  USER_DESCRIPTION,
  USER_LIST_DESCRIPTION,
} from "../../_constants";
import { log } from "../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("user")} ${magenta("<subcommand>")} ${yellow("[options]")}

Commands:
  ${cyan("list")}                ${USER_LIST_DESCRIPTION}

Options:
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${USER_DESCRIPTION}

${usage}
`;

export const logHelpUser = () => log(help);
