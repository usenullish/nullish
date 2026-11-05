import { type Option } from "@usenullish/nullish-common";
import { startTransition, useEffect, useState, ViewTransition } from "react";
import { useRevalidator } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { MigrationsService } from "~/lib/services/migrations.services";
import { TextShimmerLoader } from "~/ui/components/loader";
import { useI18n } from "~/kit/i18n/i18n.context";

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

  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    let timeout: Option<ReturnType<typeof setTimeout>> = undefined;
    let cancelled = false;

    const poll = async (attempt: number) => {
      const result = await MigrationsService.create().getRunJobState({ migrationId, jobId });

      if (cancelled) {
        return;
      }

      if (
        result.status === "success" &&
        (result.result.status === "completed" || result.result.status === "failed")
      ) {
        await revalidate();
        onDone(result.result);
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
  }, [migrationId, jobId, revalidate, onDone]);

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
