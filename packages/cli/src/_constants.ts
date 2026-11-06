import { grey, yellow } from "./utils/colors";
import { version } from "../../../package.json";

export const TITLE_AND_VERSION = `Nullish CLI ${grey(`v${version}`)}`;

export const OPTION_HELP = `${yellow("-h, --help")}           Output usage information`;

export const USER_DESCRIPTION = "Manage users";
export const USER_LIST_DESCRIPTION = "List the users";

export const ORGANIZATION_DESCRIPTION = "Manage organizations";
export const ORGANIZATION_DELETE_DESCRIPTION =
  "Delete an organization, their records and audit logs";
