import { cyan, lime, magenta, yellow } from "../../../utils/colors";
import {
  OPTION_HELP,
  SUBSCRIPTION_CUSTOM_PRODUCT_CREATE_DESCRIPTION,
  SUBSCRIPTION_CUSTOM_PRODUCT_DELETE_DESCRIPTION,
  SUBSCRIPTION_CUSTOM_PRODUCT_DESCRIPTION,
  SUBSCRIPTION_CUSTOM_PRODUCT_LIST_DESCRIPTION,
  TITLE_AND_VERSION,
} from "../../../_constants";
import { log } from "../../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("subscription")} ${cyan("custom-product")} ${magenta("<subcommand>")} ${yellow("[options]")}

Commands:
  ${cyan("list")}                ${SUBSCRIPTION_CUSTOM_PRODUCT_LIST_DESCRIPTION}
  ${cyan("create")}              ${SUBSCRIPTION_CUSTOM_PRODUCT_CREATE_DESCRIPTION}
  ${cyan("delete")}              ${SUBSCRIPTION_CUSTOM_PRODUCT_DELETE_DESCRIPTION}

Options:
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${SUBSCRIPTION_CUSTOM_PRODUCT_DESCRIPTION}

${usage}
`;

export const logHelpSubscriptionCustomProduct = () => log(help);
