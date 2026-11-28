import { expect } from "@playwright/test";
import { assertNonNullish } from "../../packages/common/src/asserts/nullish";
import type { Option } from "../../packages/common/src/option";
import { OnboardingStepsPage } from "./onboarding-steps.page";
import { testIds } from "../../packages/client/app/kit/tests/test-ids.constants";
import { TIMEOUT_AVERAGE } from "../_e2e.constants";

const INVOICE_URL = /\/billing\/invoices\/[^/]+$/;

export class InvoicesPage extends OnboardingStepsPage {
  #invoiceUrl: Option<string>;

  rememberInvoice(): void {
    this.#invoiceUrl = this.page.url();
  }

  async openInvoice(): Promise<void> {
    assertNonNullish(this.#invoiceUrl);

    await this.page.goto(this.#invoiceUrl);
  }

  async editDueOn({ dueOn }: { dueOn: string }): Promise<void> {
    await this.click(testIds.invoices.edit);

    await expect(this.page).toHaveURL(/\/billing\/invoices\/[^/]+\/edit$/);

    await this.page.getByTestId(testIds.invoices.dueOn).fill(dueOn);

    await this.click(testIds.invoices.save);

    await expect(this.page).toHaveURL(INVOICE_URL);
  }

  async assertDueOn({ dueOn }: { dueOn: string }): Promise<void> {
    await this.click(testIds.invoices.edit);

    await expect(this.page.getByTestId(testIds.invoices.dueOn)).toHaveValue(dueOn, TIMEOUT_AVERAGE);

    await this.openInvoice();
  }

  async addLine({
    description,
    quantity,
    unitPrice,
  }: {
    description: string;
    quantity: string;
    unitPrice: string;
  }): Promise<void> {
    await this.click(testIds.invoices.addLine);

    await this.page.getByTestId(testIds.lines.description).fill(description);
    await this.page.getByTestId(testIds.lines.quantity).fill(quantity);
    await this.page.getByTestId(testIds.lines.unitPrice).fill(unitPrice);

    await this.click(testIds.lines.create);

    await expect(this.page).toHaveURL(INVOICE_URL);
  }

  async openDraft(): Promise<void> {
    await this.click(testIds.invoices.open);
    await this.click(`${testIds.invoices.open}-confirm`);

    await expect(this.page.getByTestId(testIds.invoices.open)).toHaveCount(0);
  }

  async assertNotEditable(): Promise<void> {
    await expect(this.page.getByTestId(testIds.invoices.edit)).toHaveCount(0);
  }

  async assertEditRedirects(): Promise<void> {
    assertNonNullish(this.#invoiceUrl);

    await this.page.goto(`${this.#invoiceUrl}/edit`);

    await expect(this.page).toHaveURL(INVOICE_URL);
  }
}
