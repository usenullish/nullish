import { cyan, lime, magenta, yellow } from "../../utils/colors";
import {
  PLAN_CREATE_DESCRIPTION,
  PLAN_DESCRIPTION,
  PLAN_DISABLE_DESCRIPTION,
  PLAN_LIST_DESCRIPTION,
  OPTION_HELP,
  TITLE_AND_VERSION,
} from "../../_constants";
import { log } from "../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("plan")} ${magenta("<subcommand>")} ${yellow("[options]")}

Commands:
  ${cyan("list")}                ${PLAN_LIST_DESCRIPTION}
  ${cyan("create")}              ${PLAN_CREATE_DESCRIPTION}
  ${cyan("disable")}             ${PLAN_DISABLE_DESCRIPTION}

Options:
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${PLAN_DESCRIPTION}

${usage}
`;

export const logHelpPlan = () => log(help);
