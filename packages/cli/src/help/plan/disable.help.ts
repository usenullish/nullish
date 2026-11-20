import { cyan, lime, magenta, yellow } from "../../utils/colors";
import { PLAN_DISABLE_DESCRIPTION, OPTION_HELP, TITLE_AND_VERSION } from "../../_constants";
import { log } from "../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("plan")} ${magenta("disable")} ${yellow("[options]")}

Options:
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${PLAN_DISABLE_DESCRIPTION}

${usage}
`;

export const logHelpPlanDisable = () => log(help);
