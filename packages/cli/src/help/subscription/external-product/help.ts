import { cyan, lime, magenta, yellow } from "../../../utils/colors";
import {
  OPTION_HELP,
  SUBSCRIPTION_EXTERNAL_PRODUCT_CREATE_DESCRIPTION,
  SUBSCRIPTION_EXTERNAL_PRODUCT_DELETE_DESCRIPTION,
  SUBSCRIPTION_EXTERNAL_PRODUCT_DESCRIPTION,
  SUBSCRIPTION_EXTERNAL_PRODUCT_LIST_DESCRIPTION,
  TITLE_AND_VERSION,
} from "../../../_constants";
import { log } from "../../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("subscription")} ${cyan("external-product")} ${magenta("<subcommand>")} ${yellow("[options]")}

Commands:
  ${cyan("list")}                ${SUBSCRIPTION_EXTERNAL_PRODUCT_LIST_DESCRIPTION}
  ${cyan("create")}              ${SUBSCRIPTION_EXTERNAL_PRODUCT_CREATE_DESCRIPTION}
  ${cyan("delete")}              ${SUBSCRIPTION_EXTERNAL_PRODUCT_DELETE_DESCRIPTION}

Options:
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${SUBSCRIPTION_EXTERNAL_PRODUCT_DESCRIPTION}

${usage}
`;

export const logHelpSubscriptionExternalProduct = () => log(help);
