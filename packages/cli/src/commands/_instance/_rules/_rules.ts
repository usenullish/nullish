import { InstanceRulesService } from "@usenullish/nullish-admin/instance";
import { isNullish, type Nullable, type Option } from "@usenullish/nullish-common";
import type { DbAdminContext } from "@usenullish/nullish-db";
import type { Records } from "@usenullish/nullish-schema/records";
import { exit } from "../../../utils/exit";

type InstanceRules = Records["Instance"]["InstanceRules"]["Select"];

export const getInstanceRules = async ({
  dbContext,
}: {
  dbContext: DbAdminContext;
}): Promise<Option<InstanceRules>> => {
  const result = await InstanceRulesService.create({ db: dbContext.connection }).get();

  if (result.status === "error") {
    exit({ msg: "Cannot read the instance rules.", err: result.err });
  }

  return result.result;
};

const maximumLabel = (maximum: Nullable<number>): string =>
  isNullish(maximum) ? "unlimited" : String(maximum);

export const rulesLabel = (rules: Option<InstanceRules>): string =>
  `Max organizations: ${maximumLabel(rules?.maxOrganizations ?? null)}\nMax members: ${maximumLabel(rules?.maxMembers ?? null)}`;
