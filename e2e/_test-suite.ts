import { type Browser, test } from "@playwright/test";
import type { AppPage, AppPageConstructor } from "./page-objects/app.page";

export const initTestSuite = <T extends AppPage>(
  AppPageClass: AppPageConstructor<T>,
): (() => T) => {
  test.describe.configure({ mode: "serial" });

  let browser: Browser;
  let appPage: T;

  test.beforeAll(async ({ playwright }) => {
    browser = await playwright.chromium.launch();

    const context = await browser.newContext();
    const page = await context.newPage();

    appPage = new AppPageClass({
      page,
      context,
    });

    await appPage.goto();
  });

  test.afterAll(async () => {
    await browser.close();
  });

  return (): T => appPage;
};
