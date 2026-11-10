import { expect } from "@playwright/test";
import { join } from "node:path";
import { OnboardingPage } from "./onboarding.page";
import { testIds } from "../../packages/client/app/kit/tests/test-ids.constants";
import type { MigrationDatasetType } from "../../packages/schema/src/db/constants/migrations";

const FIXTURES = join(process.cwd(), "e2e", "fixtures", "bexio");

const TIMEOUT_MIGRATION = { timeout: 60_000 };

export class MigrationPage extends OnboardingPage {
  get #organizationPath(): string {
    const [, organizationId] = /\/orgs\/([^/]+)/.exec(new URL(this.page.url()).pathname) ?? [];

    expect(organizationId).toBeDefined();

    return `/orgs/${organizationId}`;
  }

  async createNetRateTax({
    code,
    rate,
    netRate,
    startOn,
  }: {
    code: string;
    rate: string;
    netRate: string;
    startOn: string;
  }): Promise<void> {
    const ratesPath = `${this.#organizationPath}/accounting/vat/rates`;

    await this.page.goto(`${ratesPath}/new`);

    await this.page.getByTestId(testIds.vatRate.code).fill(code);
    await this.page.getByTestId(testIds.vatRate.rate).fill(rate);
    await this.page.getByTestId(testIds.vatRate.netRate).fill(netRate);
    await this.page.getByTestId(testIds.vatRate.startOn).fill(startOn);

    await this.click(testIds.vatRate.submit);

    await expect(this.page).toHaveURL(ratesPath);
  }

  async startMigration(): Promise<void> {
    await this.page.goto(`${this.#organizationPath}/migrations/new`);

    await this.click(testIds.migration.next);

    await expect(this.page).toHaveURL(/\/migrations\/[^/]+\/import$/);
  }

  async uploadDataset({
    type,
    file,
    validOn,
  }: {
    type: MigrationDatasetType;
    file: string;
    validOn?: string;
  }): Promise<void> {
    await this.click(testIds.migration.addFile);

    await this.click(testIds.migration.type);
    await this.click(`${testIds.migration.type}-${type}`);

    if (validOn !== undefined) {
      await this.page.getByTestId(testIds.migration.validOn).fill(validOn);
    }

    await this.page
      .getByTestId(testIds.migration.file)
      .locator("input[type=file]")
      .setInputFiles(join(FIXTURES, file));

    await this.click(testIds.migration.upload);

    await expect(this.page.getByTestId(testIds.migration.upload)).toBeHidden();
  }

  async runMigration(): Promise<void> {
    await this.click(testIds.migration.run);

    await expect(this.page.getByTestId(testIds.migration.continue)).toBeVisible(TIMEOUT_MIGRATION);
  }
}
