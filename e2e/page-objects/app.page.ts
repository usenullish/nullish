import { type BrowserContext, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import type { TestId } from "../../packages/client/app/kit/tests/test-id";
import { TIMEOUT_AVERAGE } from "../_e2e.constants";

export interface AppPageArgs {
  page: Page;
  context: BrowserContext;
}

export interface AppPageConstructor<T extends AppPage> {
  new (args: AppPageArgs): T;
}

export abstract class AppPage {
  readonly #page: Page;
  readonly #context: BrowserContext;

  constructor({ page, context }: AppPageArgs) {
    this.#page = page;
    this.#context = context;
  }

  protected get page(): Page {
    return this.#page;
  }

  protected get context(): BrowserContext {
    return this.#context;
  }

  async goto(): Promise<void> {
    await this.#page.goto("/");
  }

  async open(testId: TestId): Promise<void> {
    await this.click(testId);
  }

  async click(testId: TestId): Promise<void> {
    await expect(this.#page.getByTestId(testId)).toBeVisible(TIMEOUT_AVERAGE);
    await this.#page.getByTestId(testId).click();
  }

  async waitForAnimation(): Promise<void> {
    await this.page.waitForTimeout(1000);
  }
}
