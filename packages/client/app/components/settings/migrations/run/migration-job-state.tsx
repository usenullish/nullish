import { ViewTransition } from "react";
import { useRevalidator } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { MigrationsService } from "~/lib/services/migrations.services";
import { TextShimmerLoader } from "~/ui/components/loader";
import { useI18n } from "~/kit/i18n/i18n.context";
import { usePollJobState } from "~/kit/data/job-state.hooks";

type JobState = Api["MigrationsRun"]["Client"]["RunMigrationJobStateResponse"];

const POLL_INTERVAL_MS = 2000;
const POLL_MAX_ATTEMPTS = 150;

export const MigrationJobState = ({
  migrationId,
  jobId,
  onDone,
}: {
  migrationId: Api["Migrations"]["Client"]["Migration"]["id"];
  jobId: Api["MigrationsRun"]["Client"]["RunMigrationResponse"]["jobId"];
  onDone: (state: JobState) => void;
}) => {
  const { i18n } = useI18n();
  const { revalidate } = useRevalidator();

  const { timedOut } = usePollJobState({
    jobId,
    getJobState: () => MigrationsService.create().getRunJobState({ migrationId, jobId }),
    onDone: async (state) => {
      await revalidate();
      onDone(state);
    },
    intervalMs: POLL_INTERVAL_MS,
    maxAttempts: POLL_MAX_ATTEMPTS,
  });

  if (timedOut) {
    return (
      <ViewTransition>
        <p className="text-center text-xs text-muted-foreground">{i18n.migrations.text.timeout}</p>
      </ViewTransition>
    );
  }

  return (
    <div className="flex justify-center">
      <TextShimmerLoader text={i18n.migrations.state.running} size="sm" />
    </div>
  );
};
