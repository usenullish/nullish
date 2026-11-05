import type { Api } from "@usenullish/nullish-schema/server";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { SortableHeader } from "~/components/core/sortable-header";
import { MigrationStatusBadge } from "~/components/settings/migrations/list/migration-status-badge";
import { MigrationActions } from "~/components/settings/migrations/list/migration-actions";
import { useFormatDateTime } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";

export const MigrationsTable = ({
  migrations,
}: {
  migrations: Api["Migrations"]["Client"]["Migration"][];
}) => {
  const { i18n } = useI18n();
  const formatDateTime = useFormatDateTime();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <SortableHeader field="createdAt" label={i18n.migrations.label.created_at} />
          <TableHead>{i18n.core.label.from}</TableHead>
          <SortableHeader field="status" label={i18n.core.label.status} />
          <TableHead className="w-px" />
        </TableRow>
      </TableHeader>

      <TableBody>
        {migrations.length === 0 ? (
          <TableRow>
            <TableCell colSpan={4} className="text-muted-foreground">
              {i18n.migrations.text.empty}
            </TableCell>
          </TableRow>
        ) : (
          migrations.map((migration) => (
            <TableRow key={migration.id}>
              <TableCell className="tabular-nums">{formatDateTime(migration.createdAt)}</TableCell>
              <TableCell className="whitespace-normal">
                {i18n.migrations.provider[migration.provider]}
              </TableCell>
              <TableCell>
                <MigrationStatusBadge status={migration.status} />
              </TableCell>
              <TableCell className="w-px">
                <MigrationActions migration={migration} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
