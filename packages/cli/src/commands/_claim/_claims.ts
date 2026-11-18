import { isCancel, select, text } from "@clack/prompts";
import { ClaimsService } from "@usenullish/nullish-admin/subscription";
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

type Claim = Records["Subscription"]["Claims"]["Select"];

export const listClaims = async ({
  dbContext,
}: {
  dbContext: DbAdminContext;
}): Promise<Claim[]> => {
  const result = await ClaimsService.create({ db: dbContext.connection }).list();

  if (result.status === "error") {
    exit({
      msg: "Cannot list the claims.",
      err: result.err,
    });
  }

  return result.result;
};

export const claimLabel = ({
  id,
  trialDays,
  expiresAt,
  provider,
  externalProductId,
}: Claim): string =>
  `${id} (trial: ${trialDays ?? "none"}, ends: ${expiresAt?.toISOString().slice(0, 10) ?? "never"}, product: ${nonNullish(provider) ? `${provider} ${externalProductId}` : "none"})`;

export const promptClaimProduct = async (): Promise<
  Pick<Claim, "provider" | "externalProductId">
> => {
  const provider = await select<Claim["provider"]>({
    message: "Which payment provider is this claim linked to?",
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

export const promptClaimExpiresAt = async ({
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
