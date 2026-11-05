import { isNullish, type Option } from "@usenullish/nullish-common";
import { startTransition, useEffect, useState, ViewTransition } from "react";
import { Check } from "lucide-react";
import type { Api } from "@usenullish/nullish-schema/server";
import { InvoicesService } from "~/lib/services/invoices.services";
import { API_URL } from "~/env";
import { Button } from "~/ui/components/button";
import { TextShimmerLoader } from "~/ui/components/loader";
import { useI18n } from "~/kit/i18n/i18n.context";

const POLL_INTERVAL_MS = 1000;
const POLL_MAX_ATTEMPTS = 30;

export const PdfInvoiceJobState = ({
  invoiceId,
  jobId,
}: {
  invoiceId: Api["Invoices"]["Client"]["Invoice"]["id"];
  jobId: Api["Invoices"]["Client"]["PdfInvoiceResponse"]["jobId"];
}) => {
  const { i18n } = useI18n();
  const [state, setState] = useState<Api["Invoices"]["Client"]["PdfInvoiceJobStateResponse"]>();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let timeout: Option<ReturnType<typeof setTimeout>> = undefined;
    let cancelled = false;

    const poll = async (attempt: number) => {
      const result = await InvoicesService.create().getPdfJobState({ invoiceId, jobId });

      if (cancelled) {
        return;
      }

      if (
        result.status === "success" &&
        (result.result.status === "completed" || result.result.status === "failed")
      ) {
        const { result: jobState } = result;
        startTransition(() => setState(jobState));
        return;
      }

      if (attempt >= POLL_MAX_ATTEMPTS) {
        startTransition(() => setTimedOut(true));
        return;
      }

      timeout = setTimeout(() => void poll(attempt + 1), POLL_INTERVAL_MS);
    };

    void poll(1);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [invoiceId, jobId]);

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
                  rel="noreferrer"
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
