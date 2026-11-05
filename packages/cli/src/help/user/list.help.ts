import { cyan, lime, magenta, yellow } from "../../utils/colors";
import { OPTION_HELP, TITLE_AND_VERSION, USER_LIST_DESCRIPTION } from "../../_constants";
import { log } from "../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("user")} ${magenta("list")} ${yellow("[options]")}

Options:
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${USER_LIST_DESCRIPTION}

${usage}
`;

export const logHelpUserList = () => log(help);
