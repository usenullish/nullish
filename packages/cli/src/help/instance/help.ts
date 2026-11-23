import { cyan, lime, magenta, yellow } from "../../utils/colors";
import {
  INSTANCE_DESCRIPTION,
  INSTANCE_RULES_DESCRIPTION,
  OPTION_HELP,
  TITLE_AND_VERSION,
} from "../../_constants";
import { log } from "../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("instance")} ${magenta("<subcommand>")} ${yellow("[options]")}

Commands:
  ${cyan("rules")}               ${INSTANCE_RULES_DESCRIPTION}

Options:
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${INSTANCE_DESCRIPTION}

${usage}
`;

export const logHelpInstance = () => log(help);
