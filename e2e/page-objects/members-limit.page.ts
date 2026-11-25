import { expect } from "@playwright/test";
import { SignInPage } from "./sign-in.page";
import { testIds } from "../../packages/client/app/kit/tests/test-ids.constants";
import { assertNonNullish } from "../../packages/common/src/asserts/nullish";

export class MembersLimitPage extends SignInPage {
  async openNewInvitation(): Promise<void> {
    const [, organizationId] = /\/orgs\/([^/]+)/.exec(new URL(this.page.url()).pathname) ?? [];

    assertNonNullish(organizationId);

    await this.page.goto(`/orgs/${organizationId}/team/invitations/new`);
  }

  async assertLimitReached(): Promise<void> {
    await expect(this.page.getByTestId(testIds.invitations.limitReached)).toBeVisible();
    await expect(this.page.getByTestId(testIds.invitations.submit)).toBeDisabled();
  }
}
