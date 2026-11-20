import { isCancel, select, text } from "@clack/prompts";
import { PlansService } from "@usenullish/nullish-admin/subscription";
import {
  DateStringCodec,
  isEmptyString,
  isNullish,
  nonNullish,
  type Option,
} from "@usenullish/nullish-common";
import type { DbAdminContext } from "@usenullish/nullish-db";
import { SubscriptionProvider } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { cancel, exit } from "../../utils/exit";

type Plan = Records["Subscription"]["Plans"]["Select"];

export const listPlans = async ({ dbContext }: { dbContext: DbAdminContext }): Promise<Plan[]> => {
  const result = await PlansService.create({ db: dbContext.connection }).list();

  if (result.status === "error") {
    exit({
      msg: "Cannot list the plans.",
      err: result.err,
    });
  }

  return result.result;
};

export const planLabel = ({
  id,
  trialDays,
  expiresAt,
  provider,
  externalProductId,
}: Plan): string =>
  `${id} (trial: ${trialDays ?? "none"}, ends: ${expiresAt?.toISOString().slice(0, 10) ?? "never"}, product: ${nonNullish(provider) ? `${provider} ${externalProductId}` : "none"})`;

export const promptPlanProduct = async (): Promise<
  Pick<Plan, "provider" | "externalProductId">
> => {
  const provider = await select<Plan["provider"]>({
    message: "Which payment provider is this plan linked to?",
    options: [
      { label: "None", value: null },
      ...Object.values(SubscriptionProvider).map((value) => ({ label: value, value })),
    ],
  });

  if (isCancel(provider)) {
    cancel();
  }

  if (isNullish(provider)) {
    return { provider: null, externalProductId: null };
  }

  const externalProductId = await text({
    message: "What is the product ID at this provider?",
    placeholder: "e.g. prod_123",
    validate: (input) => (isEmptyString(input) ? "Enter the ID of the product." : undefined),
  });

  if (isCancel(externalProductId)) {
    cancel();
  }

  return { provider, externalProductId };
};

export const promptPlanExpiresAt = async ({
  message,
}: {
  message: string;
}): Promise<Option<Date>> => {
  const value = await text({
    message,
    placeholder: "YYYY-MM-DD, empty for no end",
    validate: (input) =>
      isEmptyString(input) || DateStringCodec.safeDecode(input ?? "").success
        ? undefined
        : "Enter a date as YYYY-MM-DD.",
  });

  if (isCancel(value)) {
    cancel();
  }

  return isEmptyString(value) ? undefined : DateStringCodec.decode(value);
};
