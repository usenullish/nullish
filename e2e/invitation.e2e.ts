import { test } from "@playwright/test";
import { initTestSuite } from "./_test-suite";
import { InvitationPage } from "./page-objects/invitation.page";

const getInvitationPage = initTestSuite(InvitationPage);

const invitee = { name: "E2E Invitee", email: `e2e-${crypto.randomUUID()}@example.com` };

test("signs up a new user with an organization", async () => {
  const invitationPage = getInvitationPage();

  await invitationPage.signUp({
    name: "E2E User",
    email: `e2e-${crypto.randomUUID()}@example.com`,
    password: "e2e-password",
  });

  await invitationPage.createOrganization({ name: "E2E Inviting Organization" });
});

test("invites a member by email", async () => {
  const invitationPage = getInvitationPage();

  await invitationPage.invite({ email: invitee.email });
});

test("signs up from the invitation email and joins the organization", async () => {
  const invitationPage = getInvitationPage();

  await invitationPage.acceptAsNewUser({ ...invitee, password: "e2e-password" });
});
