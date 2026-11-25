import type { TestIds } from "./test-id";

export const testIds = {
  signIn: {
    email: "input-sign-in-email",
    password: "input-sign-in-password",
    submit: "btn-sign-in",
  },
  signUp: {
    name: "input-sign-up-name",
    email: "input-sign-up-email",
    password: "input-sign-up-password",
    submit: "btn-sign-up",
  },
  forgotPassword: {
    email: "input-forgot-password-email",
    submit: "btn-forgot-password",
  },
  resetPassword: {
    password: "input-reset-password-password",
    submit: "btn-reset-password",
  },
  newOrganization: {
    name: "input-organization-name",
    submit: "btn-new-organization",
    ready: "btn-organization-ready",
  },
  setup: {
    vat: "btn-setup-vat",
  },
  vat: {
    number: "input-vat-number",
    paymentMethod: "btn-vat-payment-method",
    remunerationMethod: "btn-vat-remuneration-method",
  },
  vatRate: {
    code: "input-vat-rate-code",
    rate: "input-vat-rate-rate",
    netRate: "input-vat-rate-net-rate",
    startOn: "input-vat-rate-start-on",
    submit: "btn-vat-rate-create",
  },
  migration: {
    next: "btn-migration-next",
    addFile: "btn-migration-add-file",
    type: "btn-migration-dataset-type",
    validOn: "input-migration-valid-on",
    file: "input-migration-file",
    upload: "btn-migration-upload",
    run: "btn-migration-run",
    continue: "btn-migration-continue",
  },
  chat: {
    prompt: "input-chat-prompt",
  },
  invitations: {
    email: "input-invitation-email",
    submit: "btn-invitation-create",
    signUp: "btn-invitation-sign-up",
    accept: "btn-invitation-accept",
  },
  home: {
    organization: "link-home-organization",
  },
  navigation: {
    organization: "link-navigation-organization",
  },
  organizations: {
    locked: "card-organization-locked",
    seePlans: "link-organization-see-plans",
    backToOrganizations: "link-organization-back-to-organizations",
    grace: "text-organization-grace",
  },
  subscription: {
    choosePlan: "link-subscription-choose-plan",
    billing: "btn-subscription-billing",
    plan: "card-subscription-plan",
    instance: "card-subscription-instance",
    onPrem: "card-subscription-on-prem",
    requestInstance: "link-subscription-request-instance",
    getInTouch: "link-subscription-get-in-touch",
    subscribe: "btn-subscription-subscribe",
    status: "text-subscription-status",
    periodEnd: "text-subscription-period-end",
    activating: "text-subscription-activating",
    timeout: "text-subscription-timeout",
    backToOrganization: "link-subscription-back-to-organization",
  },
} as const satisfies TestIds;
