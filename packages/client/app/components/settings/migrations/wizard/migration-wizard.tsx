import { startTransition, useCallback, useState, ViewTransition } from "react";
import { Link } from "react-router";
import { Check, CircleAlert, Plus } from "lucide-react";
import { isNullish, nonNullish, type Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { MigrationStatus } from "@usenullish/nullish-schema/db";
import { MigrationStep } from "~/components/settings/migrations/wizard/migration-step";
import { WriteGuard } from "~/components/auth/guards/write-guard";
import { DatasetsTable } from "~/components/settings/migrations/datasets/datasets-table";
import { UploadDataset } from "~/components/settings/migrations/datasets/upload-dataset";
import { RunMigration } from "~/components/settings/migrations/run/run-migration";
import { MigrationJobState } from "~/components/settings/migrations/run/migration-job-state";
import { OrganizationPath } from "~/navigation";
import { Alert, AlertDescription, AlertTitle } from "~/ui/components/alert";
import { Button } from "~/ui/components/button";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

type Migration = Api["Migrations"]["Client"]["Migration"];
type Dataset = Api["MigrationsDatasets"]["Client"]["Dataset"];
type JobId = Api["MigrationsRun"]["Client"]["RunMigrationResponse"]["jobId"];
type JobState = Api["MigrationsRun"]["Client"]["RunMigrationJobStateResponse"];

export const MigrationWizard = ({
  organizationId,
  migration,
  datasets,
}: {
  organizationId: Api["Organizations"]["Client"]["Organization"]["id"];
  migration: Migration;
  datasets: Dataset[];
}) => {
  const { i18n } = useI18n();

  const [jobId, setJobId] = useState<Option<JobId>>(undefined);
  const [jobState, setJobState] = useState<Option<JobState>>(undefined);

  const onStarted = ({ jobId }: { jobId: JobId }) =>
    startTransition(() => {
      setJobState(undefined);
      setJobId(jobId);
    });

  const onDone = useCallback((state: JobState) => startTransition(() => setJobState(state)), []);

  const provider = i18n.migrations.provider[migration.provider];
  const backTo = OrganizationPath.create({ organizationId }).to({ path: "/migrations" });

  const processing = nonNullish(jobId) && isNullish(jobState);
  const succeeded =
    jobState?.status === "completed" ||
    (isNullish(jobState) && migration.status === MigrationStatus.SUCCEEDED);
  const failed =
    jobState?.status === "failed" ||
    (isNullish(jobState) && migration.status === MigrationStatus.FAILED);
  const files = !processing && !succeeded && !failed;

  return (
    <MigrationStep
      title={replacePlaceholders(i18n.migrations.text.title, { "{provider}": provider })}
      closeTo={backTo}
      current={succeeded ? "result" : files ? "files" : "processing"}
      intro={
        files
          ? replacePlaceholders(i18n.migrations.text.description, { "{provider}": provider })
          : undefined
      }
    >
      {processing && <MigrationJobState migrationId={migration.id} jobId={jobId} onDone={onDone} />}

      {!processing && succeeded && <MigrationSucceeded backTo={backTo} />}

      {!processing && failed && (
        <MigrationFailed migration={migration} jobState={jobState} onStarted={onStarted} />
      )}

      {files && <MigrationFiles migration={migration} datasets={datasets} onStarted={onStarted} />}
    </MigrationStep>
  );
};

const MigrationFiles = ({
  migration,
  datasets,
  onStarted,
}: {
  migration: Migration;
  datasets: Dataset[];
  onStarted: (args: { jobId: JobId }) => void;
}) => {
  const { i18n } = useI18n();
  const [uploadOpen, setUploadOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <WriteGuard>
        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setUploadOpen(true)}>
            <Plus />
            {i18n.migrations.action.add_file}
          </Button>
        </div>
        <UploadDataset migration={migration} open={uploadOpen} onOpenChange={setUploadOpen} />
      </WriteGuard>

      <DatasetsTable migration={migration} datasets={datasets} />

      <WriteGuard>
        <RunMigration
          migrationId={migration.id}
          label={i18n.migrations.action.run}
          disabled={datasets.length === 0}
          onStarted={onStarted}
        />
      </WriteGuard>
    </div>
  );
};

const MigrationFailed = ({
  migration,
  jobState,
  onStarted,
}: {
  migration: Migration;
  jobState: Option<JobState>;
  onStarted: (args: { jobId: JobId }) => void;
}) => {
  const { i18n } = useI18n();

  const reason = jobState?.status === "failed" ? jobState.reason : undefined;

  return (
    <div className="flex flex-col gap-4">
      <ViewTransition>
        <Alert variant="destructive">
          <CircleAlert />
          <AlertTitle>{i18n.migrations.text.failed}</AlertTitle>
          {nonNullish(reason) && <AlertDescription>{reason}</AlertDescription>}
        </Alert>
      </ViewTransition>

      <WriteGuard>
        <RunMigration
          migrationId={migration.id}
          label={i18n.migrations.action.retry}
          disabled={false}
          onStarted={onStarted}
        />
      </WriteGuard>
    </div>
  );
};

const MigrationSucceeded = ({ backTo }: { backTo: string }) => {
  const { i18n } = useI18n();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 pb-24 text-center">
      <ViewTransition>
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          {i18n.migrations.text.succeeded}
          <Check className="size-4" />
        </h2>
      </ViewTransition>

      <Button nativeButton={false} render={<Link to={backTo} />}>
        {i18n.migrations.action.continue}
      </Button>
    </div>
  );
};
