import { cyan, lime, magenta, yellow } from "../../utils/colors";
import {
  CLAIM_CREATE_DESCRIPTION,
  CLAIM_DESCRIPTION,
  CLAIM_DISABLE_DESCRIPTION,
  CLAIM_LIST_DESCRIPTION,
  OPTION_HELP,
  TITLE_AND_VERSION,
} from "../../_constants";
import { log } from "../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("claim")} ${magenta("<subcommand>")} ${yellow("[options]")}

Commands:
  ${cyan("list")}                ${CLAIM_LIST_DESCRIPTION}
  ${cyan("create")}              ${CLAIM_CREATE_DESCRIPTION}
  ${cyan("disable")}             ${CLAIM_DISABLE_DESCRIPTION}

Options:
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${CLAIM_DESCRIPTION}

${usage}
`;

export const logHelpClaim = () => log(help);
