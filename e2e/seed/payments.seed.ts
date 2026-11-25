import { eq } from "drizzle-orm";
import { OpenOrganizationService } from "../../packages/engine/src/core";
import { DbSchema, LegalForm, SubscriptionStatus } from "../../packages/schema/src/db";
import type { Records } from "../../packages/schema/src/records";
import { PAYMENTS_SEED } from "./payments.seed.constants";
import { openE2EDb } from "./_db.seed";
import { signUpE2EUser } from "./_auth.seed";

type Subscription = Records["Subscription"]["Subscriptions"]["Select"];
type UserId = Records["Auth"]["Users"]["Select"]["id"];

const instance = await openE2EDb();
const { connection: db } = instance;

const openOrganization = async ({
  userId,
  name,
  subscription,
}: {
  userId: UserId;
  name: string;
  subscription: Pick<Subscription, "status" | "periodEnd">;
}): Promise<void> => {
  const result = await OpenOrganizationService.create({
    db,
    userId,
    trialReminder: null,
  }).open({ organization: { name, legalForm: LegalForm.LLC } });

  if (result.status === "error") {
    throw result.err;
  }

  const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

  await db
    .update(subscriptions)
    .set(subscription)
    .where(eq(subscriptions.organizationId, result.result.id));
};

try {
  const userId = await signUpE2EUser({ db, user: PAYMENTS_SEED.user });

  const DAY_MS = 24 * 60 * 60 * 1000;
  const yesterday = new Date(Date.now() - DAY_MS);

  await openOrganization({
    userId,
    ...PAYMENTS_SEED.organizations.expiredTrial,
    subscription: { status: SubscriptionStatus.TRIALING, periodEnd: yesterday },
  });

  await openOrganization({
    userId,
    ...PAYMENTS_SEED.organizations.pastDue,
    subscription: { status: SubscriptionStatus.PAST_DUE, periodEnd: yesterday },
  });

  console.log("E2E payments seeded.");
} finally {
  await instance.close();
}
