import type { Api } from "@usenullish/nullish-schema/server";
import { MigrationStatus } from "@usenullish/nullish-schema/db";
import { Badge } from "~/ui/components/badge";
import { useI18n } from "~/kit/i18n/i18n.context";

export const MigrationStatusBadge = ({
  status,
}: {
  status: Api["Migrations"]["Client"]["Migration"]["status"];
}) => {
  const { i18n } = useI18n();

  return (
    <Badge variant={status === MigrationStatus.DRAFT ? "outline" : "secondary"}>
      {i18n.migrations.status[status]}
    </Badge>
  );
};
