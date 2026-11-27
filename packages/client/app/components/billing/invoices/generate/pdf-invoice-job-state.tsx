import { isNullish } from "@usenullish/nullish-common";
import { ViewTransition } from "react";
import { Check } from "lucide-react";
import type { Api } from "@usenullish/nullish-schema/server";
import { InvoicesService } from "~/lib/services/invoices.services";
import { API_URL } from "~/env";
import { Button } from "~/ui/components/button";
import { TextShimmerLoader } from "~/ui/components/loader";
import { useI18n } from "~/kit/i18n/i18n.context";
import { usePollJobState } from "~/kit/data/job-state.hooks";

export const PdfInvoiceJobState = ({
  invoiceId,
  jobId,
}: {
  invoiceId: Api["Invoices"]["Client"]["Invoice"]["id"];
  jobId: Api["Invoices"]["Client"]["PdfInvoiceResponse"]["jobId"];
}) => {
  const { i18n } = useI18n();
  const { state, timedOut } = usePollJobState({
    jobId,
    getJobState: () => InvoicesService.create().getPdfJobState({ invoiceId, jobId }),
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 py-10">
      {state?.status === "completed" && (
        <ViewTransition>
          <div className="flex flex-col items-start gap-4">
            <p className="flex items-center gap-2 text-xs">
              <Check className="size-4" />
              {i18n.invoices.text.pdf_generated}
            </p>
            <Button
              nativeButton={false}
              render={
                // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- labelled by the Button's children
                <a
                  href={`${API_URL}/billing/invoices/${invoiceId}/pdf/documents/${state.result.documentId}/download`}
                  target="_blank"
                  rel="noopener noreferrer"
                />
              }
            >
              {i18n.invoices.action.download}
            </Button>
          </div>
        </ViewTransition>
      )}

      {state?.status === "failed" && (
        <ViewTransition>
          <p className="text-xs text-destructive">
            {i18n.invoices.text.pdf_failed}
            {state.reason ? `: ${state.reason}` : ""}
          </p>
        </ViewTransition>
      )}

      {timedOut && (
        <ViewTransition>
          <p className="text-xs text-muted-foreground">{i18n.invoices.text.pdf_timeout}</p>
        </ViewTransition>
      )}

      {isNullish(state) && !timedOut && (
        <TextShimmerLoader text={i18n.invoices.state.printing} size="sm" />
      )}
    </div>
  );
};
