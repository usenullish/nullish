import { cyan, lime, magenta, yellow } from "../../../utils/colors";
import {
  OPTION_HELP,
  SUBSCRIPTION_TAX_RATE_CREATE_DESCRIPTION,
  SUBSCRIPTION_TAX_RATE_DESCRIPTION,
  SUBSCRIPTION_TAX_RATE_DISABLE_DESCRIPTION,
  SUBSCRIPTION_TAX_RATE_LIST_DESCRIPTION,
  TITLE_AND_VERSION,
} from "../../../_constants";
import { log } from "../../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("subscription")} ${cyan("tax-rate")} ${magenta("<subcommand>")} ${yellow("[options]")}

Commands:
  ${cyan("list")}                ${SUBSCRIPTION_TAX_RATE_LIST_DESCRIPTION}
  ${cyan("create")}              ${SUBSCRIPTION_TAX_RATE_CREATE_DESCRIPTION}
  ${cyan("disable")}             ${SUBSCRIPTION_TAX_RATE_DISABLE_DESCRIPTION}

Options:
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${SUBSCRIPTION_TAX_RATE_DESCRIPTION}

${usage}
`;

export const logHelpSubscriptionTaxRate = () => log(help);
