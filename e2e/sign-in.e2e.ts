import { test } from "@playwright/test";
import { initTestSuite } from "./_test-suite";
import { SignInPage } from "./page-objects/sign-in.page";

const getSignInPage = initTestSuite(SignInPage);

test("shows the sign-in form to a signed-out visitor", async () => {
  const signInPage = getSignInPage();

  await signInPage.assertSignInVisible();
});
