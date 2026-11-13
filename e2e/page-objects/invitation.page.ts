import { expect, type Page } from "@playwright/test";
import { OnboardingPage } from "./onboarding.page";
import { SignUpPage } from "./sign-up.page";
import { testIds } from "../../packages/client/app/kit/tests/test-ids.constants";
import { assertNonNullish } from "../../packages/common/src/asserts/nullish";
import { consumeLink } from "../_mailpit";
import { TIMEOUT_AVERAGE } from "../_e2e.constants";

export class InvitationPage extends OnboardingPage {
  get #organizationPath(): string {
    const [, organizationId] = /\/orgs\/([^/]+)/.exec(new URL(this.page.url()).pathname) ?? [];

    assertNonNullish(organizationId);

    return `/orgs/${organizationId}`;
  }

  async invite({ email }: { email: string }): Promise<void> {
    await expect(this.page).toHaveURL(/\/orgs\/[^/]+\/setup\/vat$/);

    await this.page.goto(`${this.#organizationPath}/team/invitations/new`);

    await this.page.getByTestId(testIds.invitations.email).fill(email);

    await this.click(testIds.invitations.submit);

    await expect(this.page.getByText(email)).toBeVisible(TIMEOUT_AVERAGE);
  }

  async acceptAsNewUser({
    name,
    email,
    password,
  }: {
    name: string;
    email: string;
    password: string;
  }): Promise<Page> {
    const browser = this.context.browser();

    assertNonNullish(browser);

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(await consumeLink({ to: email }));

    await expect(page.getByTestId(testIds.invitations.signUp)).toBeVisible(TIMEOUT_AVERAGE);
    await page.getByTestId(testIds.invitations.signUp).click();

    await new SignUpPage({ page, context }).signUp({ name, email, password });

    await expect(page.getByTestId(testIds.invitations.accept)).toBeVisible(TIMEOUT_AVERAGE);
    await page.getByTestId(testIds.invitations.accept).click();

    await expect(page).toHaveURL(/\/orgs\/[^/]+$/);

    return page;
  }
}
