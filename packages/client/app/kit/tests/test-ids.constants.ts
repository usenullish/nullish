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
} as const satisfies TestIds;
