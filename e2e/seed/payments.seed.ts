import { eq } from "drizzle-orm";
import { OpenOrganizationService } from "../../packages/engine/src/core";
import {
  DbSchema,
  LegalForm,
  MembershipRole,
  SubscriptionStatus,
} from "../../packages/schema/src/db";
import type { Records } from "../../packages/schema/src/records";
import { PAYMENTS_SEED } from "./payments.seed.constants";
import { openE2EDb } from "./_db.seed";
import { signUpE2EUser } from "./_auth.seed";

type Subscription = Records["Subscription"]["Subscriptions"]["Select"];
type OrganizationId = Subscription["organizationId"];
type UserId = Records["Auth"]["Users"]["Select"]["id"];

const instance = await openE2EDb();
const { connection: db } = instance;

const openOrganization = async ({
  userId,
  name,
}: {
  userId: UserId;
  name: string;
}): Promise<OrganizationId> => {
  const result = await OpenOrganizationService.create({
    db,
    userId,
    trialReminder: null,
  }).open({ organization: { name, legalForm: LegalForm.LLC } });

  if (result.status === "error") {
    throw result.err;
  }

  return result.result.id;
};

const updateSubscription = async ({
  organizationId,
  subscription,
}: {
  organizationId: OrganizationId;
  subscription: Pick<Subscription, "status" | "periodEnd">;
}): Promise<void> => {
  const subscriptions = DbSchema.Subscription.Subscriptions.SubscriptionsSchema;

  await db
    .update(subscriptions)
    .set(subscription)
    .where(eq(subscriptions.organizationId, organizationId));
};

const addMember = async ({
  organizationId,
  user,
}: {
  organizationId: OrganizationId;
  user: Parameters<typeof signUpE2EUser>[0]["user"];
}): Promise<void> => {
  const userId = await signUpE2EUser({ db, user });

  const memberships = DbSchema.Core.Memberships.MembershipsSchema;

  await db.insert(memberships).values({ organizationId, userId, role: MembershipRole.REVIEWER });
};

try {
  const userId = await signUpE2EUser({ db, user: PAYMENTS_SEED.user });

  const DAY_MS = 24 * 60 * 60 * 1000;
  const yesterday = new Date(Date.now() - DAY_MS);

  const expiredTrialId = await openOrganization({
    userId,
    ...PAYMENTS_SEED.organizations.expiredTrial,
  });

  await updateSubscription({
    organizationId: expiredTrialId,
    subscription: { status: SubscriptionStatus.TRIALING, periodEnd: yesterday },
  });

  const pastDueId = await openOrganization({
    userId,
    ...PAYMENTS_SEED.organizations.pastDue,
  });

  await updateSubscription({
    organizationId: pastDueId,
    subscription: { status: SubscriptionStatus.PAST_DUE, periodEnd: yesterday },
  });

  const membersLimitId = await openOrganization({
    userId,
    ...PAYMENTS_SEED.organizations.membersLimit,
  });

  for (const member of PAYMENTS_SEED.members) {
    await addMember({ organizationId: membersLimitId, user: member });
  }

  console.log("E2E payments seeded.");
} finally {
  await instance.close();
}
