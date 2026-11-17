import { SubscriptionSettingsService } from "@usenullish/nullish-admin/subscription";
import { isNullish } from "@usenullish/nullish-common";
import type { DbAdminContext } from "@usenullish/nullish-db";
import type { Records } from "@usenullish/nullish-schema/records";
import { exit } from "../../../utils/exit";

type SubscriptionSettings = Records["Subscription"]["SubscriptionSettings"]["Select"];

export const getSubscriptionSettings = async ({
  dbContext,
}: {
  dbContext: DbAdminContext;
}): Promise<SubscriptionSettings> => {
  const result = await SubscriptionSettingsService.create({ db: dbContext.connection }).get();

  if (result.status === "error") {
    exit({ msg: "Cannot read the subscription settings.", err: result.err });
  }

  if (isNullish(result.result)) {
    exit({ msg: "The subscription settings are missing." });
  }

  return result.result;
};

export const settingsLabel = ({ initialClaimId, graceDays }: SubscriptionSettings): string =>
  `Initial claim: ${initialClaimId}\nGrace days: ${graceDays}`;
