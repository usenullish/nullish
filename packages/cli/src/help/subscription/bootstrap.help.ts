import { cyan, lime, magenta, yellow } from "../../utils/colors";
import {
  OPTION_HELP,
  SUBSCRIPTION_BOOTSTRAP_DESCRIPTION,
  TITLE_AND_VERSION,
} from "../../_constants";
import { log } from "../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("subscription")} ${cyan("bootstrap")} ${magenta("<file>")} ${yellow("[options]")}

Options:
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${SUBSCRIPTION_BOOTSTRAP_DESCRIPTION}

${usage}
`;

export const logHelpSubscriptionBootstrap = () => log(help);
