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
    skip: "link-setup-skip",
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
  onboarding: {
    task: "link-onboarding-task",
  },
  clients: {
    name: "input-client-name",
    create: "btn-client-create",
  },
  invoices: {
    client: "input-invoice-client",
    dueOn: "input-invoice-due-on",
    create: "btn-invoice-create",
    edit: "link-invoice-edit",
    save: "btn-invoice-save",
    addLine: "link-invoice-add-line",
    open: "btn-invoice-open",
  },
  lines: {
    description: "input-line-description",
    quantity: "input-line-quantity",
    unitPrice: "input-line-unit-price",
    create: "btn-line-create",
  },
  bankRelations: {
    name: "input-bank-relation-name",
    iban: "input-bank-relation-iban",
    account: "input-bank-relation-account",
    create: "btn-bank-relation-create",
    upload: "btn-bank-relation-upload",
    file: "input-bank-relation-file",
    uploadFile: "btn-bank-relation-upload-file",
  },
  bankMovements: {
    details: "card-bank-movement-details",
  },
  invitations: {
    email: "input-invitation-email",
    submit: "btn-invitation-create",
    signUp: "btn-invitation-sign-up",
    accept: "btn-invitation-accept",
    limitReached: "text-invitation-limit-reached",
  },
  home: {
    organization: "link-home-organization",
  },
  navigation: {
    organization: "link-navigation-organization",
  },
  accountLedger: {
    posting: "link-account-ledger-posting",
  },
  organizations: {
    locked: "card-organization-locked",
    seePlans: "link-organization-see-plans",
    backToOrganizations: "link-organization-back-to-organizations",
    grace: "text-organization-grace",
    export: "btn-organization-export",
    exportDownload: "link-organization-export-download",
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
    endsOn: "text-subscription-ends-on",
    manage: "btn-subscription-manage",
    activating: "text-subscription-activating",
    activated: "text-subscription-activated",
    continue: "link-subscription-continue",
    timeout: "text-subscription-timeout",
    backToOrganization: "link-subscription-back-to-organization",
  },
} as const satisfies TestIds;
