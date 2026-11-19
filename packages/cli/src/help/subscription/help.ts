import { cyan, lime, magenta, yellow } from "../../utils/colors";
import {
  OPTION_HELP,
  SUBSCRIPTION_DESCRIPTION,
  SUBSCRIPTION_SETTINGS_DESCRIPTION,
  SUBSCRIPTION_TAX_RATE_DESCRIPTION,
  TITLE_AND_VERSION,
} from "../../_constants";
import { log } from "../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("subscription")} ${magenta("<subcommand>")} ${yellow("[options]")}

Commands:
  ${cyan("settings")}            ${SUBSCRIPTION_SETTINGS_DESCRIPTION}
  ${cyan("tax-rate")}            ${SUBSCRIPTION_TAX_RATE_DESCRIPTION}

Options:
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${SUBSCRIPTION_DESCRIPTION}

${usage}
`;

export const logHelpSubscription = () => log(help);
