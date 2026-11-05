import { cyan, lime, magenta, yellow } from "../../utils/colors";
import { OPTION_HELP, ORGANIZATION_DELETE_DESCRIPTION, TITLE_AND_VERSION } from "../../_constants";
import { log } from "../../utils/log";

const usage = `Usage: ${lime("nullish")} ${cyan("organization")} ${magenta("delete")} ${yellow("[options]")}

Options:
  ${yellow("--dry-run")}           List the organizations marked as deleted without deleting any.
  ${OPTION_HELP}
`;

const help = `${TITLE_AND_VERSION}

${ORGANIZATION_DELETE_DESCRIPTION}

${usage}
`;

export const logHelpOrganizationDelete = () => log(help);
