import type { Route } from "./+types/orgs.$org-id.billing.invoices.$id.pdf";
import { DocumentTemplatesServer } from "~/context/server/document-templates.server";
import { TemplateContentsServer } from "~/context/server/document-templates+contents.server";
import { BankRelationsServer } from "~/context/server/bank-relations.server";
import { PdfInvoice } from "~/components/billing/invoices/generate/pdf-invoice";
import { useInvoice } from "~/context/contexts/invoice.context";
import { useClients } from "~/context/contexts/clients.context";
import { useOrganization } from "~/context/contexts/organization.context";
import { useI18n } from "~/kit/i18n/i18n.context";
import type { BreadcrumbHandle } from "~/kit/router/route-handle";
import { BillingPath } from "~/navigation";

export const handle: BreadcrumbHandle = {
  breadcrumb: {
    back: ({ organizationId, params }) =>
      BillingPath.create({ organizationId }).to({ path: `/invoices/${params.id ?? ""}` }),
    label: ({ i18n }) => i18n.invoices.label.pdf,
  },
};

export const loader = async (args: Route.LoaderArgs) => {
  const [templates, bankRelations] = await Promise.all([
    DocumentTemplatesServer.create().listAllDocumentTemplates(args),
    BankRelationsServer.create().listAllBankRelations(args),
  ]);

  const contents = await TemplateContentsServer.create().listAllContents({
    args,
    templateIds: (templates?.templates ?? []).map(({ id }) => id),
  });

  return { templates, contents, bankRelations };
};

// /orgs/:org-id/invoices/:id/pdf
const PdfInvoicePage = ({ loaderData }: Route.ComponentProps) => {
  const { i18n } = useI18n();
  const invoice = useInvoice();
  const organization = useOrganization();
  const clients = useClients();
  const { templates, contents, bankRelations } = loaderData;

  const client = clients?.find(({ id }) => id === invoice.clientId);

  return (
    <PdfInvoice
      invoiceId={invoice.id}
      templates={templates?.templates ?? []}
      contents={contents?.contents ?? []}
      language={client?.language ?? organization.language ?? i18n.lang}
      bankRelations={bankRelations?.bankRelations ?? []}
    />
  );
};

export default PdfInvoicePage;
