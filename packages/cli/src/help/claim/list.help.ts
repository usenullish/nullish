import { cyan, lime, magenta, yellow } from "../../utils/colors";
import { CLAIM_LIST_DESCRIPTION, OPTION_HELP, TITLE_AND_VERSION } from "../../_constants";
import { log } from "../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("claim")} ${magenta("list")} ${yellow("[options]")}

Options:
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${CLAIM_LIST_DESCRIPTION}

${usage}
`;

export const logHelpClaimList = () => log(help);
