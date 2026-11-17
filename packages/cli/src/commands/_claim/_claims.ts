import { isCancel, text } from "@clack/prompts";
import { ClaimsService } from "@usenullish/nullish-admin/subscription";
import { DateStringCodec, isEmptyString, type Option } from "@usenullish/nullish-common";
import type { DbAdminContext } from "@usenullish/nullish-db";
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

export const claimLabel = ({ id, trialDays, expiresAt }: Claim): string =>
  `${id} (trial: ${trialDays ?? "none"}, ends: ${expiresAt?.toISOString().slice(0, 10) ?? "never"})`;

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
