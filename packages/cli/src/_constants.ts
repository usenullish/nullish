import { grey, yellow } from "./utils/colors";
import { version } from "../../../package.json";

export const TITLE_AND_VERSION = `Nullish CLI ${grey(`v${version}`)}`;

export const OPTION_HELP = `${yellow("-h, --help")}           Output usage information`;

export const USER_DESCRIPTION = "Manage users";
export const USER_LIST_DESCRIPTION = "List the users";

export const ORGANIZATION_DESCRIPTION = "Manage organizations";
export const ORGANIZATION_DELETE_DESCRIPTION =
  "Delete an organization, their records and audit logs";

export const CLAIM_DESCRIPTION = "Manage the claims of the subscriptions";
export const CLAIM_LIST_DESCRIPTION = "List the claims";
export const CLAIM_CREATE_DESCRIPTION = "Create a claim";
export const CLAIM_DISABLE_DESCRIPTION = "Disable a claim";

export const SUBSCRIPTION_DESCRIPTION = "Manage the subscriptions";
export const SUBSCRIPTION_SETTINGS_DESCRIPTION = "Manage the initial claim and the grace days";
export const SUBSCRIPTION_SETTINGS_SHOW_DESCRIPTION = "Show the initial claim and the grace days";
export const SUBSCRIPTION_SETTINGS_UPDATE_DESCRIPTION =
  "Change the initial claim and the grace days";
