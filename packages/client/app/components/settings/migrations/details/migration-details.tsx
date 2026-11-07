import { Link } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { MigrationStatus } from "@usenullish/nullish-schema/db";
import { Button } from "~/ui/components/button";
import { WriteGuard } from "~/components/auth/guards/write-guard";
import { useOrganization } from "~/context/contexts/organization.context";
import { OrganizationPath } from "~/navigation";
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
  const organization = useOrganization();
  const formatDateTime = useFormatDateTime();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-xs font-medium">
            {replacePlaceholders(i18n.migrations.text.title, {
              "{provider}": i18n.migrations.provider[migration.provider],
            })}
          </h1>
          <MigrationStatusBadge status={migration.status} />
        </div>

        {migration.status !== MigrationStatus.SUCCEEDED && (
          <WriteGuard>
            <Button
              nativeButton={false}
              render={
                <Link
                  to={OrganizationPath.create({ organizationId: organization.id }).to({
                    path: `/migrations/${migration.id}/import`,
                  })}
                />
              }
            >
              {i18n.migrations.action.continue}
            </Button>
          </WriteGuard>
        )}
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
        <dt className="text-muted-foreground">{i18n.migrations.label.created_at}</dt>
        <dd className="tabular-nums">{formatDateTime(migration.createdAt)}</dd>
      </dl>

      <DatasetsTable migration={migration} datasets={datasets} />
    </div>
  );
};
