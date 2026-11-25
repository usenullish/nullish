import { test } from "@playwright/test";
import { initTestSuite } from "../_test-suite";
import { MembersLimitPage } from "../page-objects/members-limit.page";
import { PAYMENTS_SEED } from "../seed/payments.seed.constants";

const getMembersLimitPage = initTestSuite(MembersLimitPage);

test("signs in the seeded user", async () => {
  const membersLimitPage = getMembersLimitPage();

  const { email, password } = PAYMENTS_SEED.user;

  await membersLimitPage.signIn({ email, password });

  await membersLimitPage.assertSignedIn();
});

test("prevents inviting once the plan's members limit is reached", async () => {
  const membersLimitPage = getMembersLimitPage();

  await membersLimitPage.openOrganization(PAYMENTS_SEED.organizations.membersLimit);

  await membersLimitPage.openNewInvitation();

  await membersLimitPage.assertLimitReached();
});
