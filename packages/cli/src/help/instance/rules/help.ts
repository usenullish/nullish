import { cyan, lime, magenta, yellow } from "../../../utils/colors";
import {
  INSTANCE_RULES_DESCRIPTION,
  INSTANCE_RULES_SHOW_DESCRIPTION,
  INSTANCE_RULES_UPDATE_DESCRIPTION,
  OPTION_HELP,
  TITLE_AND_VERSION,
} from "../../../_constants";
import { log } from "../../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("instance")} ${cyan("rules")} ${magenta("<subcommand>")} ${yellow("[options]")}

Commands:
  ${cyan("show")}                ${INSTANCE_RULES_SHOW_DESCRIPTION}
  ${cyan("update")}              ${INSTANCE_RULES_UPDATE_DESCRIPTION}

Options:
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${INSTANCE_RULES_DESCRIPTION}

${usage}
`;

export const logHelpInstanceRules = () => log(help);
