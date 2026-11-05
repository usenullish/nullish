import type { Api } from "@usenullish/nullish-schema/server";
import { DeleteRecord } from "~/components/core/delete-record";
import { MigrationsService } from "~/lib/services/migrations.services";
import { useI18n } from "~/kit/i18n/i18n.context";

export const DeleteMigration = ({
  migration,
  open,
  onOpenChange,
}: {
  migration: Api["Migrations"]["Client"]["Migration"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { i18n } = useI18n();

  return (
    <DeleteRecord
      delete={() => MigrationsService.create().delete({ migrationId: migration.id })}
      texts={{
        title: i18n.migrations.text.delete_title,
        description: i18n.migrations.text.delete_description,
        success: i18n.migrations.toast.delete_success,
        error: i18n.migrations.toast.delete_error,
      }}
      open={open}
      onOpenChange={onOpenChange}
    />
  );
};
