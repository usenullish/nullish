export const PAYMENTS_SEED = {
  user: {
    name: "E2E Payments",
    email: "e2e-payments@example.com",
    password: "e2e-password",
  },
  organizations: {
    expiredTrial: { name: "E2E Expired Trial" },
    pastDue: { name: "E2E Past Due" },
  },
} as const;
