import { TriangleAlert } from "lucide-react";
import type { Api } from "@usenullish/nullish-schema/server";
import { MigrationDatasetType } from "@usenullish/nullish-schema/db";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { DatasetActions } from "~/components/settings/migrations/datasets/dataset-actions";
import { useFormatDateTime } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";

export const DatasetsTable = ({
  migration,
  datasets,
  alreadyImportedDatasets = [],
}: {
  migration: Api["Migrations"]["Client"]["Migration"];
  datasets: Api["MigrationsDatasets"]["Client"]["Dataset"][];
  alreadyImportedDatasets?: Api["MigrationDatasetSummaries"]["Client"]["DatasetSummary"][];
}) => {
  const { i18n } = useI18n();
  const formatDateTime = useFormatDateTime();

  const probablyImported = ({ type, name }: Api["MigrationsDatasets"]["Client"]["Dataset"]) =>
    [MigrationDatasetType.JOURNAL, MigrationDatasetType.BALANCES].includes(type) &&
    alreadyImportedDatasets.some(({ dataset }) => dataset.type === type && dataset.name === name);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{i18n.core.label.type}</TableHead>
            <TableHead>{i18n.migrations.label.file}</TableHead>
            <TableHead>{i18n.core.label.updated_at}</TableHead>
            <TableHead className="w-px" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {datasets.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground">
                {i18n.migrations.text.empty_files}
              </TableCell>
            </TableRow>
          ) : (
            datasets.map((dataset) => (
              <TableRow key={dataset.id}>
                <TableCell>{i18n.migrations.type[dataset.type]}</TableCell>
                <TableCell className="whitespace-normal">
                  {dataset.name}
                  {probablyImported(dataset) && (
                    <TriangleAlert className="ml-2 inline size-3 text-amber-700 dark:text-amber-400" />
                  )}
                </TableCell>
                <TableCell className="tabular-nums">{formatDateTime(dataset.updatedAt)}</TableCell>
                <TableCell className="w-px">
                  <DatasetActions migration={migration} dataset={dataset} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {datasets.some(probablyImported) && (
        <p className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
          <TriangleAlert className="size-3" />
          {i18n.migrations.text.probably_imported}
        </p>
      )}
    </>
  );
};
