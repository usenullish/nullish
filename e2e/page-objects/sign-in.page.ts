import { AppPage } from "./app.page";
import { expect } from "@playwright/test";
import { testIds } from "../../packages/client/app/kit/tests/test-ids.constants";

export class SignInPage extends AppPage {
  async signIn({ email, password }: { email: string; password: string }): Promise<void> {
    await this.page.getByTestId(testIds.signIn.email).fill(email);
    await this.page.getByTestId(testIds.signIn.password).fill(password);

    await this.click(testIds.signIn.submit);
  }

  async assertSignedIn(): Promise<void> {
    await expect(this.page.getByTestId(testIds.signIn.submit)).toBeHidden();
  }

  async assertSignInVisible() {
    await expect(this.page.getByTestId(testIds.signIn.email)).toBeVisible();
    await expect(this.page.getByTestId(testIds.signIn.password)).toBeVisible();
    await expect(this.page.getByTestId(testIds.signIn.submit)).toBeVisible();
  }
}
