import type { Api } from "@usenullish/nullish-schema/server";
import { useActionState } from "react";
import { type FormState, INIT_FORM_STATE } from "~/context/form/form";
import { buildUsePdfInvoiceAction } from "~/context/form/pdf-invoice.form";
import { PdfInvoiceForm } from "~/components/billing/invoices/generate/pdf-invoice-form";
import { PdfInvoiceJobState } from "~/components/billing/invoices/generate/pdf-invoice-job-state";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useActionWithNotifyError } from "~/kit/data/form.hooks";

export const PdfInvoice = ({
  invoiceId,
  templates,
  contents,
  language,
  bankRelations,
}: {
  invoiceId: Api["Invoices"]["Client"]["Invoice"]["id"];
  templates: Api["DocumentTemplates"]["Client"]["GetDocumentTemplatesResponse"]["templates"];
  contents: Api["TemplateContents"]["Client"]["GetTemplateContentsResponse"]["contents"];
  language: Api["TemplateContents"]["Client"]["TemplateContent"]["language"];
  bankRelations: Api["BankRelations"]["Client"]["GetBankRelationsResponse"]["bankRelations"];
}) => {
  const { i18n } = useI18n();

  const generateAction = useActionWithNotifyError({
    action: buildUsePdfInvoiceAction({ invoiceId }),
    errorMsg: i18n.invoices.toast.pdf_error,
  });

  const [state, onAction, pending] = useActionState<
    FormState<Api["Invoices"]["Client"]["PdfInvoiceResponse"]>,
    FormData
  >(generateAction, INIT_FORM_STATE);

  if (state.name === "ready") {
    return <PdfInvoiceJobState invoiceId={invoiceId} jobId={state.result.jobId} />;
  }

  return (
    <PdfInvoiceForm
      onAction={onAction}
      pending={pending}
      templates={templates}
      contents={contents}
      language={language}
      bankRelations={bankRelations}
    />
  );
};
