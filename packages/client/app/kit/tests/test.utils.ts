import { nonNullish, type Option } from "@usenullish/nullish-common";
import type { TestId } from "./test-id";

const isTest = (): boolean => JSON.parse(import.meta.env.VITE_E2E ?? "false") === true;

export const testId = (testId: Option<TestId>): { ["data-tid"]?: string } => ({
  ...(isTest() && nonNullish(testId) && { "data-tid": testId }),
});
