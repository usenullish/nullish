import { test } from "@playwright/test";
import { initTestSuite } from "./_test-suite";
import { SignUpPage } from "./page-objects/sign-up.page";

const getSignUpPage = initTestSuite(SignUpPage);

test("signs up a new user and opens the creation of an organization", async () => {
  const signUpPage = getSignUpPage();

  await signUpPage.signUp({
    name: "E2E User",
    email: `e2e-${crypto.randomUUID()}@example.com`,
    password: "e2e-password",
  });

  await signUpPage.assertNewOrganizationVisible();
});
