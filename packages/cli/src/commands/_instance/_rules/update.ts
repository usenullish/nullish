import { intro, isCancel, note, text } from "@clack/prompts";
import { InstanceRulesService } from "@usenullish/nullish-admin/instance";
import { isEmptyString, isNullish, type Nullable } from "@usenullish/nullish-common";
import { withDbContext } from "../../../db";
import { lime } from "../../../utils/colors";
import { cancel, exit } from "../../../utils/exit";
import { getInstanceRules, rulesLabel } from "./_rules";

const validateMaximum = (input: string | undefined): string | undefined =>
  /^([1-9]\d*)?$/.test(input ?? "")
    ? undefined
    : "Enter a number, 1 or more, or leave empty for unlimited.";

const toMaximum = (input: string): Nullable<number> =>
  isEmptyString(input) ? null : Number(input);

const promptMaximum = async ({
  message,
  current,
}: {
  message: string;
  current: Nullable<number>;
}): Promise<Nullable<number>> => {
  const input = await text({
    message,
    initialValue: isNullish(current) ? "" : String(current),
    placeholder: "unlimited",
    validate: validateMaximum,
  });

  if (isCancel(input)) {
    cancel();
  }

  return toMaximum(input);
};

export const instanceRulesUpdate = async (_args?: string[]) => {
  console.log();
  intro(lime("nullish"));

  await withDbContext(async (dbContext) => {
    const rules = await getInstanceRules({ dbContext });

    const maxOrganizations = await promptMaximum({
      message: "How many organizations can the instance have? Leave empty for unlimited.",
      current: rules?.maxOrganizations ?? null,
    });

    const maxMembers = await promptMaximum({
      message: "How many members can the instance have? Leave empty for unlimited.",
      current: rules?.maxMembers ?? null,
    });

    const result = await InstanceRulesService.create({ db: dbContext.connection }).upsert({
      rules: { maxOrganizations, maxMembers },
    });

    if (result.status === "error") {
      exit({ msg: "Cannot update the instance rules.", err: result.err });
    }

    note(rulesLabel(result.result), "Instance rules updated.");
  });
};
