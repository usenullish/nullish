import { expect } from "@playwright/test";
import { join } from "node:path";
import { OnboardingPage } from "./onboarding.page";
import { testIds } from "../../packages/client/app/kit/tests/test-ids.constants";
import { TIMEOUT_AVERAGE } from "../_e2e.constants";

const FIXTURES = join(process.cwd(), "e2e", "fixtures", "banking");

export class BankingPage extends OnboardingPage {
  async createBankRelation({
    name,
    iban,
    accountCode,
  }: {
    name: string;
    iban: string;
    accountCode: string;
  }): Promise<void> {
    await this.click(`${testIds.onboarding.task}-bankRelation`);

    await expect(this.page).toHaveURL(/\/banking\/new$/);

    await this.page.getByTestId(testIds.bankRelations.name).fill(name);
    await this.page.getByTestId(testIds.bankRelations.iban).fill(iban);

    await this.page.getByTestId(testIds.bankRelations.account).locator("input").fill(accountCode);
    await this.page.getByRole("option").first().click();

    await this.click(testIds.bankRelations.create);

    await expect(this.page).toHaveURL(/\/banking\/[^/]+$/);
  }

  async importStatement({ file }: { file: string }): Promise<void> {
    await this.click(testIds.bankRelations.upload);

    await this.page
      .getByTestId(testIds.bankRelations.file)
      .locator("input[type=file]")
      .setInputFiles(join(FIXTURES, file));

    await this.click(testIds.bankRelations.uploadFile);

    await expect(this.page).toHaveURL(/\/banking\/[^/]+\/reconcile$/);
  }

  async assertMovementToReconcile({ bankReference }: { bankReference: string }): Promise<void> {
    await expect(this.page.getByTestId(testIds.bankMovements.details)).toContainText(
      bankReference,
      TIMEOUT_AVERAGE,
    );
  }
}
