import { expect, type Page } from "@playwright/test";

const STRIPE_CHECKOUT_URL = /^https:\/\/checkout\.stripe\.com\//;
const STRIPE_PORTAL_URL = /^https:\/\/billing\.stripe\.com\//;

export const assertStripePortal = async ({ page }: { page: Page }): Promise<void> => {
  await expect(page).toHaveURL(STRIPE_PORTAL_URL, { timeout: 15_000 });
};

export const cancelOnStripe = async ({ page }: { page: Page }): Promise<void> => {
  await page.locator('[data-test="cancel-subscription"]').click();

  await page.getByRole("button", { name: "Continuer vers l'annulation" }).click();

  await page.locator('[data-testid="confirm"]').click();
};

export const renewOnStripe = async ({ page }: { page: Page }): Promise<void> => {
  await page.locator('[data-test="renew-subscription"]').click();

  await page.locator('[data-testid="confirm"]').click();
};

export const leaveStripePortal = async ({ page }: { page: Page }): Promise<void> => {
  await page.getByRole("link", { name: /^nullish/ }).click();
};

export const payOnStripe = async ({
  page,
  card: { email, number, expiry, cvc, name },
}: {
  page: Page;
  card: {
    email: string;
    number: string;
    expiry: string;
    cvc: string;
    name: string;
  };
}): Promise<void> => {
  await expect(page).toHaveURL(STRIPE_CHECKOUT_URL, { timeout: 15_000 });

  const form = page.frameLocator('iframe[src*="/elements-inner-habanero-"]');

  await form.getByRole("textbox", { name: "E-mail" }).fill(email);

  const cardButton = form.getByRole("button", { name: "Carte bancaire" });
  const cardNumber = form.getByRole("textbox", { name: "Numéro de carte" });

  await expect(cardButton.or(cardNumber).first()).toBeVisible();

  // Ifs are there because CI runs with Stripe using US instead of CH
  // to customize their UI
  if (await cardButton.isVisible()) {
    await cardButton.click();
  }

  await cardNumber.fill(number);
  await form.getByRole("textbox", { name: "Date d'expiration (MM/AA)" }).fill(expiry);
  await form.getByRole("textbox", { name: "Code de sécurité" }).fill(cvc);
  await form.getByRole("textbox", { name: "Nom du titulaire de la carte" }).fill(name);

  const country = form.locator('select[name="country"]');

  if (await country.isVisible()) {
    await country.selectOption("CH");
  }

  await form.locator('[data-testid="payment-form-submit-button"]').click();
};
