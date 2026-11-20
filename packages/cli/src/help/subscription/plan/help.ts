import { cyan, lime, magenta, yellow } from "../../../utils/colors";
import {
  OPTION_HELP,
  SUBSCRIPTION_PLAN_CREATE_DESCRIPTION,
  SUBSCRIPTION_PLAN_DESCRIPTION,
  SUBSCRIPTION_PLAN_DISABLE_DESCRIPTION,
  SUBSCRIPTION_PLAN_LIST_DESCRIPTION,
  TITLE_AND_VERSION,
} from "../../../_constants";
import { log } from "../../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("subscription")} ${cyan("plan")} ${magenta("<subcommand>")} ${yellow("[options]")}

Commands:
  ${cyan("list")}                ${SUBSCRIPTION_PLAN_LIST_DESCRIPTION}
  ${cyan("create")}              ${SUBSCRIPTION_PLAN_CREATE_DESCRIPTION}
  ${cyan("disable")}             ${SUBSCRIPTION_PLAN_DISABLE_DESCRIPTION}

Options:
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${SUBSCRIPTION_PLAN_DESCRIPTION}

${usage}
`;

export const logHelpSubscriptionPlan = () => log(help);
