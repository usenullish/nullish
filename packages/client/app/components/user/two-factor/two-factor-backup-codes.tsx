import { Info } from "lucide-react";
import { Link } from "react-router";
import { Button } from "~/ui/components/button";
import { Alert, AlertDescription } from "~/ui/components/alert";
import { Field, FieldGroup } from "~/ui/components/field";
import { BackupCodesList } from "~/components/user/two-factor/backup-codes-list";
import { useI18n } from "~/kit/i18n/i18n.context";

export const TwoFactorBackupCodes = ({
  backupCodes,
  closeTo,
}: {
  backupCodes: string[];
  closeTo: string;
}) => {
  const { i18n } = useI18n();

  return (
    <FieldGroup>
      <BackupCodesList backupCodes={backupCodes} />

      <Alert className="mt-4">
        <Info />
        <AlertDescription>{i18n.two_factor.text.backup_codes_description}</AlertDescription>
      </Alert>

      <Field>
        <Button nativeButton={false} render={<Link to={closeTo} replace />}>
          {i18n.two_factor.action.done}
        </Button>
      </Field>
    </FieldGroup>
  );
};
