import type { Api } from "@usenullish/nullish-schema/server";
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
}: {
  migration: Api["Migrations"]["Client"]["Migration"];
  datasets: Api["MigrationsDatasets"]["Client"]["Dataset"][];
}) => {
  const { i18n } = useI18n();
  const formatDateTime = useFormatDateTime();

  return (
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
              <TableCell className="whitespace-normal">{dataset.name}</TableCell>
              <TableCell className="tabular-nums">{formatDateTime(dataset.updatedAt)}</TableCell>
              <TableCell className="w-px">
                <DatasetActions migration={migration} dataset={dataset} />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};
