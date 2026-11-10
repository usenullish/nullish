import { expect } from "@playwright/test";
import { SignUpPage } from "./sign-up.page";
import { testIds } from "../../packages/client/app/kit/tests/test-ids.constants";
import type {
  VatPaymentMethod,
  VatRemunerationMethod,
} from "../../packages/schema/src/db/constants/vat";

export class OnboardingPage extends SignUpPage {
  async createOrganization({ name }: { name: string }): Promise<void> {
    await this.page.getByTestId(testIds.newOrganization.name).fill(name);

    await this.click(testIds.newOrganization.submit);
  }

  async setupVat({
    vatNumber,
    paymentMethod,
    remunerationMethod,
  }: {
    vatNumber: string;
    paymentMethod: VatPaymentMethod;
    remunerationMethod: VatRemunerationMethod;
  }): Promise<void> {
    await expect(this.page).toHaveURL(/\/orgs\/[^/]+\/setup\/vat$/);

    await this.page.getByTestId(testIds.vat.number).fill(vatNumber);

    await this.click(testIds.vat.paymentMethod);
    await this.click(`${testIds.vat.paymentMethod}-${paymentMethod}`);

    await this.click(testIds.vat.remunerationMethod);
    await this.click(`${testIds.vat.remunerationMethod}-${remunerationMethod}`);

    await this.click(testIds.setup.vat);
  }

  async assertReady(): Promise<void> {
    await expect(this.page).toHaveURL(/\/orgs\/[^/]+\/setup\/ready$/);
    await expect(this.page.getByTestId(testIds.newOrganization.ready)).toBeVisible();
  }

  async letsGo(): Promise<void> {
    await this.click(testIds.newOrganization.ready);
  }

  async assertChatVisible(): Promise<void> {
    await expect(this.page).toHaveURL(/\/orgs\/[^/]+$/);
    await expect(this.page.getByTestId(testIds.chat.prompt)).toBeVisible();
  }
}
