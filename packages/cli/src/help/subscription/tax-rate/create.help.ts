import { cyan, lime, magenta, yellow } from "../../../utils/colors";
import {
  OPTION_HELP,
  SUBSCRIPTION_TAX_RATE_CREATE_DESCRIPTION,
  TITLE_AND_VERSION,
} from "../../../_constants";
import { log } from "../../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("subscription")} ${cyan("tax-rate")} ${magenta("create")} ${yellow("[options]")}

Options:
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${SUBSCRIPTION_TAX_RATE_CREATE_DESCRIPTION}

${usage}
`;

export const logHelpSubscriptionTaxRateCreate = () => log(help);
