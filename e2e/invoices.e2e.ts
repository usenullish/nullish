import { test } from "@playwright/test";
import { initTestSuite } from "./_test-suite";
import { InvoicesPage } from "./page-objects/invoices.page";

const getInvoicesPage = initTestSuite(InvoicesPage);

const client = { name: "E2E Client" };

test("signs up and creates an organization", async () => {
  const invoicesPage = getInvoicesPage();

  await invoicesPage.signUp({
    name: "E2E User",
    email: `e2e-${crypto.randomUUID()}@example.com`,
    password: "e2e-password",
  });

  await invoicesPage.createOrganization({ name: "E2E Invoices Organization" });

  await invoicesPage.skipVat();

  await invoicesPage.letsGo();

  await invoicesPage.assertOnboardingVisible();

  invoicesPage.rememberOrganization();
});

test("creates a draft invoice", async () => {
  const invoicesPage = getInvoicesPage();

  await invoicesPage.createClient(client);

  await invoicesPage.openHome();

  await invoicesPage.createInvoice({ clientName: client.name });

  invoicesPage.rememberInvoice();
});

test("edits the draft invoice", async () => {
  const invoicesPage = getInvoicesPage();

  await invoicesPage.editDueOn({ dueOn: "2026-12-31" });

  await invoicesPage.assertDueOn({ dueOn: "2026-12-31" });
});

test("adds a line to the draft invoice", async () => {
  const invoicesPage = getInvoicesPage();

  await invoicesPage.addLine({ description: "Consulting", quantity: "2", unitPrice: "150" });
});

test("opens the invoice", async () => {
  const invoicesPage = getInvoicesPage();

  await invoicesPage.openDraft();
});

test("no longer edits the open invoice", async () => {
  const invoicesPage = getInvoicesPage();

  await invoicesPage.assertNotEditable();

  await invoicesPage.assertEditRedirects();
});
