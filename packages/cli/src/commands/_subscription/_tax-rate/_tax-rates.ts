import { isCancel, text } from "@clack/prompts";
import { SubscriptionTaxRatesService } from "@usenullish/nullish-admin/subscription";
import { DateStringCodec, isEmptyString } from "@usenullish/nullish-common";
import type { DbAdminContext } from "@usenullish/nullish-db";
import type { Records } from "@usenullish/nullish-schema/records";
import { cancel, exit } from "../../../utils/exit";

type SubscriptionTaxRate = Records["Subscription"]["SubscriptionTaxRates"]["Select"];

export const listTaxRates = async ({
  dbContext,
}: {
  dbContext: DbAdminContext;
}): Promise<SubscriptionTaxRate[]> => {
  const result = await SubscriptionTaxRatesService.create({ db: dbContext.connection }).list();

  if (result.status === "error") {
    exit({
      msg: "Cannot list the tax rates.",
      err: result.err,
    });
  }

  return result.result;
};

export const taxRateLabel = ({
  id,
  provider,
  externalTaxRateId,
  startOn,
  endOn,
}: SubscriptionTaxRate): string =>
  `${id} (${provider}: ${externalTaxRateId}, from ${startOn.toISOString().slice(0, 10)} to ${endOn?.toISOString().slice(0, 10) ?? "no end"})`;

export const promptTaxRateDate = async ({ message }: { message: string }): Promise<Date> => {
  const value = await text({
    message,
    placeholder: "YYYY-MM-DD",
    validate: (input) =>
      DateStringCodec.safeDecode(input ?? "").success ? undefined : "Enter a date as YYYY-MM-DD.",
  });

  if (isCancel(value)) {
    cancel();
  }

  return DateStringCodec.decode(value);
};

export const promptTaxRateExternalId = async (): Promise<
  SubscriptionTaxRate["externalTaxRateId"]
> => {
  const externalTaxRateId = await text({
    message: "What is the ID of the tax rate at this provider?",
    placeholder: "e.g. txr_123",
    validate: (input) => (isEmptyString(input) ? "Enter the ID of the tax rate." : undefined),
  });

  if (isCancel(externalTaxRateId)) {
    cancel();
  }

  return externalTaxRateId;
};
