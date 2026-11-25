import { expect } from "@playwright/test";
import { SignInPage } from "./sign-in.page";
import { testIds } from "../../packages/client/app/kit/tests/test-ids.constants";

export class SubscriptionLockPage extends SignInPage {
  async openOrganization({ name }: { name: string }): Promise<void> {
    const link = this.page.getByTestId(testIds.home.organization).filter({ hasText: name });

    await expect(link).toBeVisible();
    await link.click();

    await expect(this.page).toHaveURL(/\/orgs\/[^/]+/);
  }

  async assertLocked(): Promise<void> {
    await expect(this.page.getByTestId(testIds.organizations.locked)).toBeVisible();
    await expect(this.page.getByTestId(testIds.organizations.seePlans)).toBeVisible();
  }

  async backToOrganizations(): Promise<void> {
    await this.click(testIds.organizations.backToOrganizations);

    await expect(this.page).toHaveURL(/\/orgs$/);
  }

  async assertGraceBannerVisible(): Promise<void> {
    await expect(this.page.getByTestId(testIds.organizations.grace)).toBeVisible();
  }
}
