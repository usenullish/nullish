import { isNullish } from "@usenullish/nullish-common";
import { ViewTransition } from "react";
import { Check } from "lucide-react";
import type { Api } from "@usenullish/nullish-schema/server";
import { ExportsService } from "~/lib/services/exports.services";
import { API_URL } from "~/env";
import { Button } from "~/ui/components/button";
import { TextShimmerLoader } from "~/ui/components/loader";
import { useI18n } from "~/kit/i18n/i18n.context";
import { usePollJobState } from "~/kit/data/job-state.hooks";

const POLL_MAX_ATTEMPTS = 120;

export const OrganizationExportJobState = ({
  organizationId,
  jobId,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  jobId: Api["Exports"]["Client"]["GenerateExportResponse"]["jobId"];
}) => {
  const { i18n } = useI18n();
  const { state, timedOut } = usePollJobState({
    jobId,
    getJobState: () => ExportsService.create().getJobState({ orgId: organizationId, jobId }),
    maxAttempts: POLL_MAX_ATTEMPTS,
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-start gap-4 py-10">
      {state?.status === "completed" && (
        <ViewTransition>
          <div className="flex flex-col items-start gap-4">
            <p className="flex items-center gap-2 text-xs">
              <Check className="size-4" />
              {i18n.organizations.text.export_ready}
            </p>
            <Button
              nativeButton={false}
              render={
                // oxlint-disable-next-line jsx-a11y/control-has-associated-label -- labelled by the Button's children
                <a
                  href={`${API_URL}/organizations/${organizationId}/exports/${state.result.exportId}/download`}
                />
              }
            >
              {i18n.organizations.action.download}
            </Button>
          </div>
        </ViewTransition>
      )}

      {state?.status === "failed" && (
        <ViewTransition>
          <p className="text-xs text-destructive">
            {i18n.organizations.text.export_failed}
            {state.reason ? `: ${state.reason}` : ""}
          </p>
        </ViewTransition>
      )}

      {timedOut && (
        <ViewTransition>
          <p className="text-xs text-muted-foreground">{i18n.organizations.text.export_timeout}</p>
        </ViewTransition>
      )}

      {isNullish(state) && !timedOut && (
        <TextShimmerLoader text={i18n.organizations.state.exporting} size="sm" />
      )}
    </div>
  );
};
