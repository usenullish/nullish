import { cyan, lime, magenta, yellow } from "../../../utils/colors";
import {
  OPTION_HELP,
  SUBSCRIPTION_CUSTOM_PRODUCT_CREATE_DESCRIPTION,
  TITLE_AND_VERSION,
} from "../../../_constants";
import { log } from "../../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("subscription")} ${cyan("custom-product")} ${magenta("create")} ${yellow("[options]")}

Options:
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${SUBSCRIPTION_CUSTOM_PRODUCT_CREATE_DESCRIPTION}

${usage}
`;

export const logHelpSubscriptionCustomProductCreate = () => log(help);
