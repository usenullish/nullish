import { AppPage } from "./app.page";
import { expect } from "@playwright/test";
import { testIds } from "../../packages/client/app/kit/tests/test-ids.constants";

export class SignInPage extends AppPage {
  async assertSignInVisible() {
    await expect(this.page.getByTestId(testIds.signIn.email)).toBeVisible();
    await expect(this.page.getByTestId(testIds.signIn.password)).toBeVisible();
    await expect(this.page.getByTestId(testIds.signIn.submit)).toBeVisible();
  }
}
