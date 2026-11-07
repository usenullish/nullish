import { useState } from "react";
import { Link } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { MigrationStatus } from "@usenullish/nullish-schema/db";
import { DropdownMenuItem } from "~/ui/components/dropdown-menu";
import { RecordActions } from "~/components/core/record-actions";
import { DeleteMigration } from "~/components/settings/migrations/delete/delete-migration";
import { useOrganization } from "~/context/contexts/organization.context";
import { OrganizationPath } from "~/navigation";
import { useI18n } from "~/kit/i18n/i18n.context";
import { WriteGuard } from "~/components/auth/guards/write-guard";

export const MigrationActions = ({
  migration,
}: {
  migration: Api["Migrations"]["Client"]["Migration"];
}) => {
  const { i18n } = useI18n();
  const organization = useOrganization();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <RecordActions
      record={migration}
      items={
        <>
          {migration.status !== MigrationStatus.SUCCEEDED && (
            <WriteGuard>
              <DropdownMenuItem
                render={
                  <Link
                    to={OrganizationPath.create({ organizationId: organization.id }).to({
                      path: `/migrations/${migration.id}/import`,
                    })}
                  />
                }
              >
                {i18n.migrations.action.continue}
              </DropdownMenuItem>
            </WriteGuard>
          )}
          <DropdownMenuItem
            render={
              <Link
                to={OrganizationPath.create({ organizationId: organization.id }).to({
                  path: `/migrations/${migration.id}`,
                })}
              />
            }
          >
            {i18n.core.action.open}
          </DropdownMenuItem>
          {migration.status !== MigrationStatus.SUCCEEDED && (
            <WriteGuard>
              <DropdownMenuItem onClick={() => setDeleteOpen(true)}>
                {i18n.core.action.delete}
              </DropdownMenuItem>
            </WriteGuard>
          )}
        </>
      }
    >
      <DeleteMigration migration={migration} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </RecordActions>
  );
};
