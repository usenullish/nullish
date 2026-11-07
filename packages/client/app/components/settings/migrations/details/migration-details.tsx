import type { Api } from "@usenullish/nullish-schema/server";
import { MigrationStatusBadge } from "~/components/settings/migrations/list/migration-status-badge";
import { DatasetsTable } from "~/components/settings/migrations/datasets/datasets-table";
import { useFormatDateTime } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const MigrationDetails = ({
  migration,
  datasets,
}: {
  migration: Api["Migrations"]["Client"]["Migration"];
  datasets: Api["MigrationsDatasets"]["Client"]["Dataset"][];
}) => {
  const { i18n } = useI18n();
  const formatDateTime = useFormatDateTime();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xs font-medium">
          {replacePlaceholders(i18n.migrations.text.title, {
            "{provider}": i18n.migrations.provider[migration.provider],
          })}
        </h1>
        <MigrationStatusBadge status={migration.status} />
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
        <dt className="text-muted-foreground">{i18n.migrations.label.created_at}</dt>
        <dd className="tabular-nums">{formatDateTime(migration.createdAt)}</dd>
      </dl>

      <DatasetsTable migration={migration} datasets={datasets} />
    </div>
  );
};
