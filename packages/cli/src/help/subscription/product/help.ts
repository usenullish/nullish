import { cyan, lime, magenta, yellow } from "../../../utils/colors";
import {
  OPTION_HELP,
  SUBSCRIPTION_PRODUCT_CREATE_DESCRIPTION,
  SUBSCRIPTION_PRODUCT_DESCRIPTION,
  TITLE_AND_VERSION,
} from "../../../_constants";
import { log } from "../../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("subscription")} ${cyan("product")} ${magenta("<subcommand>")} ${yellow("[options]")}

Commands:
  ${cyan("create")}              ${SUBSCRIPTION_PRODUCT_CREATE_DESCRIPTION}

Options:
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${SUBSCRIPTION_PRODUCT_DESCRIPTION}

${usage}
`;

export const logHelpSubscriptionProduct = () => log(help);
