import { expect } from "@playwright/test";
import { SignUpPage } from "./sign-up.page";
import { SignInPage } from "./sign-in.page";
import { testIds } from "../../packages/client/app/kit/tests/test-ids.constants";
import { consumeLink } from "../_mailpit";

export class ResetPasswordPage extends SignUpPage {
  async signOut(): Promise<void> {
    await this.context.clearCookies();
  }

  async requestPasswordReset({ email }: { email: string }): Promise<void> {
    await this.page.goto("/forgot-password");

    await this.page.getByTestId(testIds.forgotPassword.email).fill(email);

    await this.click(testIds.forgotPassword.submit);

    await expect(this.page).toHaveURL("/forgot-password/sent");
  }

  async resetPassword({ email, password }: { email: string; password: string }): Promise<void> {
    await this.page.goto(await consumeLink({ to: email }));

    await expect(this.page).toHaveURL(/\/reset-password\?token=/);

    await this.page.getByTestId(testIds.resetPassword.password).fill(password);

    await this.click(testIds.resetPassword.submit);

    await expect(this.page).toHaveURL("/reset-password/done");
  }

  async signIn({ email, password }: { email: string; password: string }): Promise<void> {
    const signInPage = new SignInPage({ page: this.page, context: this.context });

    await this.page.goto("/sign-in");

    await signInPage.signIn({ email, password });

    await signInPage.assertSignedIn();
  }
}
