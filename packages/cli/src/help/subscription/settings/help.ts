import { cyan, lime, magenta, yellow } from "../../../utils/colors";
import {
  OPTION_HELP,
  SUBSCRIPTION_SETTINGS_DESCRIPTION,
  SUBSCRIPTION_SETTINGS_SHOW_DESCRIPTION,
  SUBSCRIPTION_SETTINGS_UPDATE_DESCRIPTION,
  TITLE_AND_VERSION,
} from "../../../_constants";
import { log } from "../../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("subscription")} ${cyan("settings")} ${magenta("<subcommand>")} ${yellow("[options]")}

Commands:
  ${cyan("show")}                ${SUBSCRIPTION_SETTINGS_SHOW_DESCRIPTION}
  ${cyan("update")}              ${SUBSCRIPTION_SETTINGS_UPDATE_DESCRIPTION}

Options:
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${SUBSCRIPTION_SETTINGS_DESCRIPTION}

${usage}
`;

export const logHelpSubscriptionSettings = () => log(help);
