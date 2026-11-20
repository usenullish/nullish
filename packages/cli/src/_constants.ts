import { grey, yellow } from "./utils/colors";
import { version } from "../../../package.json";

export const TITLE_AND_VERSION = `Nullish CLI ${grey(`v${version}`)}`;

export const OPTION_HELP = `${yellow("-h, --help")}           Output usage information`;

export const USER_DESCRIPTION = "Manage users";
export const USER_LIST_DESCRIPTION = "List the users";

export const ORGANIZATION_DESCRIPTION = "Manage organizations";
export const ORGANIZATION_DELETE_DESCRIPTION =
  "Delete an organization, their records and audit logs";

export const PLAN_DESCRIPTION = "Manage the plans of the subscriptions";
export const PLAN_LIST_DESCRIPTION = "List the plans";
export const PLAN_CREATE_DESCRIPTION = "Create a plan";
export const PLAN_DISABLE_DESCRIPTION = "Disable a plan";
export const PLAN_LINK_DESCRIPTION = "Link a plan to its product at a provider";

export const SUBSCRIPTION_DESCRIPTION = "Manage the subscriptions";
export const SUBSCRIPTION_SETTINGS_DESCRIPTION = "Manage the initial plan and the grace days";
export const SUBSCRIPTION_SETTINGS_SHOW_DESCRIPTION = "Show the initial plan and the grace days";
export const SUBSCRIPTION_SETTINGS_UPDATE_DESCRIPTION =
  "Change the initial plan and the grace days";
export const SUBSCRIPTION_TAX_RATE_DESCRIPTION = "Manage the tax rates of the subscriptions";
export const SUBSCRIPTION_TAX_RATE_LIST_DESCRIPTION = "List the tax rates";
export const SUBSCRIPTION_TAX_RATE_CREATE_DESCRIPTION = "Create a tax rate";
export const SUBSCRIPTION_TAX_RATE_END_DESCRIPTION = "End a tax rate";
