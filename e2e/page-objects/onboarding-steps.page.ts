import { expect } from "@playwright/test";
import { assertNonNullish } from "../../packages/common/src/asserts/nullish";
import type { Option } from "../../packages/common/src/option";
import { testIds } from "../../packages/client/app/kit/tests/test-ids.constants";
import { TIMEOUT_AVERAGE } from "../_e2e.constants";
import { OnboardingPage } from "./onboarding.page";

type OnboardingTask = "client" | "invoice" | "bankRelation";

export class OnboardingStepsPage extends OnboardingPage {
  #organizationUrl: Option<string>;

  rememberOrganization(): void {
    const [organizationUrl] = /^.*\/orgs\/[^/?]+/.exec(this.page.url()) ?? [];

    assertNonNullish(organizationUrl);

    this.#organizationUrl = organizationUrl;
  }

  async openHome(): Promise<void> {
    assertNonNullish(this.#organizationUrl);

    await this.page.goto(this.#organizationUrl);
  }

  async assertTasksOpen({ tasks }: { tasks: OnboardingTask[] }): Promise<void> {
    for (const task of tasks) {
      await expect(this.page.getByTestId(`${testIds.onboarding.task}-${task}`)).toBeVisible(
        TIMEOUT_AVERAGE,
      );
    }
  }

  async assertTasksClosed({ tasks }: { tasks: OnboardingTask[] }): Promise<void> {
    for (const task of tasks) {
      await expect(this.page.getByTestId(`${testIds.onboarding.task}-${task}`)).toHaveCount(0);
    }
  }

  async createClient({ name }: { name: string }): Promise<void> {
    await this.click(`${testIds.onboarding.task}-client`);

    await expect(this.page).toHaveURL(/\/billing\/clients\/new$/);

    await this.page.getByTestId(testIds.clients.name).fill(name);
    await this.click(testIds.clients.create);

    await expect(this.page).toHaveURL(/\/billing\/clients\/[^/]+$/);
  }

  async createInvoice({ clientName }: { clientName: string }): Promise<void> {
    await this.click(`${testIds.onboarding.task}-invoice`);

    await expect(this.page).toHaveURL(/\/billing\/invoices\/new$/);

    await this.page.getByTestId(testIds.invoices.client).locator("input").fill(clientName);
    await this.page.getByRole("option", { name: clientName }).click();

    await this.click(testIds.invoices.create);

    await expect(this.page).toHaveURL(/\/billing\/invoices\/[^/]+$/);
  }

  async assertChatOnHome(): Promise<void> {
    await expect(this.page.getByTestId(testIds.chat.prompt)).toBeVisible(TIMEOUT_AVERAGE);
    await this.assertTasksClosed({
      tasks: ["client", "invoice", "bankRelation"],
    });
  }
}
