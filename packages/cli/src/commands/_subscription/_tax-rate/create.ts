import { intro, isCancel, note, select } from "@clack/prompts";
import { SubscriptionTaxRatesService } from "@usenullish/nullish-admin/subscription";
import { SubscriptionProvider } from "@usenullish/nullish-schema/db";
import { withDbContext } from "../../../db";
import { lime } from "../../../utils/colors";
import { cancel, exit } from "../../../utils/exit";
import { promptTaxRateDate, promptTaxRateExternalId, taxRateLabel } from "./_tax-rates";

export const subscriptionTaxRateCreate = async (_args?: string[]) => {
  console.log();
  intro(lime("nullish"));

  const provider = await select<SubscriptionProvider>({
    message: "Which payment provider is this tax rate linked to?",
    options: Object.values(SubscriptionProvider).map((value) => ({ label: value, value })),
  });

  if (isCancel(provider)) {
    cancel();
  }

  const externalTaxRateId = await promptTaxRateExternalId();

  const startOn = await promptTaxRateDate({ message: "From when does the tax rate apply?" });

  await withDbContext(async (dbContext) => {
    const result = await SubscriptionTaxRatesService.create({ db: dbContext.connection }).insert({
      taxRate: { provider, externalTaxRateId, startOn },
    });

    if (result.status === "error") {
      exit({
        msg: "Cannot create the tax rate. The current one may need to be ended first.",
        err: result.err,
      });
    }

    note(taxRateLabel(result.result), "Tax rate created.");
  });
};
