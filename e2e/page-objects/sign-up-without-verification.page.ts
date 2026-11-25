import { SignUpPage } from "./sign-up.page";
import { testIds } from "../../packages/client/app/kit/tests/test-ids.constants";

export class SignUpWithoutVerificationPage extends SignUpPage {
  override async signUp({
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

    await this.assertNewOrganizationVisible();
  }
}
