import { cyan, lime } from "../utils/colors";
import { TITLE_AND_VERSION, ORGANIZATION_DESCRIPTION, USER_DESCRIPTION } from "../_constants";

export const help = `
${TITLE_AND_VERSION}

Usage: ${lime("nullish")} ${cyan("<command>")}

Commands:
  ${cyan("organization")}        ${ORGANIZATION_DESCRIPTION}
  ${cyan("user")}                ${USER_DESCRIPTION}
  ${cyan("help")}                Display help information
`;
