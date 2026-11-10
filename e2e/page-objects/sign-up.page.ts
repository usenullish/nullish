import { AppPage } from "./app.page";
import { expect } from "@playwright/test";
import { testIds } from "../../packages/client/app/kit/tests/test-ids.constants";

export class SignUpPage extends AppPage {
  override async goto(): Promise<void> {
    await this.page.goto("/sign-up");
  }

  async signUp({
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  }): Promise<void> {
    await this.page.getByTestId(testIds.signUp.name).fill(name);
    await this.page.getByTestId(testIds.signUp.email).fill(email);
    await this.page.getByTestId(testIds.signUp.password).fill(password);

    await this.click(testIds.signUp.submit);
  }

  async assertNewOrganizationVisible(): Promise<void> {
    await expect(this.page).toHaveURL("/orgs/new");
    await expect(this.page.getByTestId(testIds.newOrganization.submit)).toBeVisible();
  }
}
