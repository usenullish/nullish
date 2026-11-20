import { cyan, lime } from "../utils/colors";
import {
  ORGANIZATION_DESCRIPTION,
  SUBSCRIPTION_DESCRIPTION,
  TITLE_AND_VERSION,
  USER_DESCRIPTION,
} from "../_constants";

export const help = `
${TITLE_AND_VERSION}

Usage: ${lime("nullish")} ${cyan("<command>")}

Commands:
  ${cyan("organization")}        ${ORGANIZATION_DESCRIPTION}
  ${cyan("subscription")}        ${SUBSCRIPTION_DESCRIPTION}
  ${cyan("user")}                ${USER_DESCRIPTION}
  ${cyan("help")}                Display help information
`;
