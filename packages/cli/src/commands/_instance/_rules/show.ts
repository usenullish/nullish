import { intro, note } from "@clack/prompts";
import { withDbContext } from "../../../db";
import { lime } from "../../../utils/colors";
import { getInstanceRules, rulesLabel } from "./_rules";

export const instanceRulesShow = async (_args?: string[]) => {
  console.log();
  intro(lime("nullish"));

  await withDbContext(async (dbContext) => {
    const rules = await getInstanceRules({ dbContext });

    note(rulesLabel(rules), "Instance rules");
  });
};
