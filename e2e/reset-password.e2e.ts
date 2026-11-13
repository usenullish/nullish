import { test } from "@playwright/test";
import { initTestSuite } from "./_test-suite";
import { ResetPasswordPage } from "./page-objects/reset-password.page";

const getResetPasswordPage = initTestSuite(ResetPasswordPage);

const email = `e2e-${crypto.randomUUID()}@example.com`;

test("signs up a new user", async () => {
  const resetPasswordPage = getResetPasswordPage();

  await resetPasswordPage.signUp({ name: "E2E User", email, password: "e2e-password" });

  await resetPasswordPage.assertNewOrganizationVisible();
});

test("requests a password reset once signed out", async () => {
  const resetPasswordPage = getResetPasswordPage();

  await resetPasswordPage.signOut();

  await resetPasswordPage.requestPasswordReset({ email });
});

test("resets the password with the link of the email", async () => {
  const resetPasswordPage = getResetPasswordPage();

  await resetPasswordPage.resetPassword({ email, password: "e2e-new-password" });
});

test("signs in with the new password", async () => {
  const resetPasswordPage = getResetPasswordPage();

  await resetPasswordPage.signIn({ email, password: "e2e-new-password" });
});
