import type { TestIds } from "~/kit/tests/test-id";

export const testIds = {
  signIn: {
    email: "input-sign-in-email",
    password: "input-sign-in-password",
    submit: "btn-sign-in",
  },
} as const satisfies TestIds;
