export const PAYMENTS_SEED = {
  user: {
    name: "E2E Payments",
    email: "e2e-payments@example.com",
    password: "e2e-password",
  },
  members: [
    {
      name: "E2E Member One",
      email: "e2e-payments-member-1@example.com",
      password: "e2e-password",
    },
    {
      name: "E2E Member Two",
      email: "e2e-payments-member-2@example.com",
      password: "e2e-password",
    },
  ],
  organizations: {
    expiredTrial: { name: "E2E Expired Trial" },
    pastDue: { name: "E2E Past Due" },
    membersLimit: { name: "E2E Members Limit" },
  },
} as const;
