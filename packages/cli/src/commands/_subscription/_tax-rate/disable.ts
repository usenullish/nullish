import { intro, isCancel, log, note, select } from "@clack/prompts";
import { SubscriptionTaxRatesService } from "@usenullish/nullish-admin/subscription";
import { isArrayAtLeastOne, isNullish } from "@usenullish/nullish-common";
import { withDbContext } from "../../../db";
import { lime } from "../../../utils/colors";
import { cancel, exit } from "../../../utils/exit";
import { listTaxRates, promptTaxRateDate, taxRateLabel } from "./_tax-rates";

export const subscriptionTaxRateDisable = async (_args?: string[]) => {
  console.log();
  intro(lime("nullish"));

  await withDbContext(async (dbContext) => {
    const taxRates = await listTaxRates({ dbContext });

    if (!isArrayAtLeastOne(taxRates)) {
      log.info("There is no tax rate.");
      return;
    }

    const taxRateId = await select({
      message: "Which tax rate should be disabled?",
      options: taxRates.map((taxRate) => ({ label: taxRateLabel(taxRate), value: taxRate.id })),
    });

    if (isCancel(taxRateId)) {
      cancel();
    }

    const endOn = await promptTaxRateDate({ message: "On which day does the tax rate end?" });

    const result = await SubscriptionTaxRatesService.create({ db: dbContext.connection }).update({
      taxRateId,
      taxRate: { endOn },
    });

    if (result.status === "error") {
      exit({
        msg: `Cannot disable the tax rate ${taxRateId}.`,
        err: result.err,
      });
    }

    if (isNullish(result.result)) {
      exit({ msg: `The tax rate ${taxRateId} was not found.` });
    }

    note(taxRateLabel(result.result), "Tax rate disabled.");
  });
};
