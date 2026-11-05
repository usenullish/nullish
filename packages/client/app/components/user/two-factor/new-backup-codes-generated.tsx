import { Info } from "lucide-react";
import { Button } from "~/ui/components/button";
import { Alert, AlertDescription } from "~/ui/components/alert";
import { DialogFooter } from "~/ui/components/dialog";
import { FieldGroup } from "~/ui/components/field";
import { BackupCodesList } from "~/components/user/two-factor/backup-codes-list";
import { useI18n } from "~/kit/i18n/i18n.context";

export const NewBackupCodesGenerated = ({
  backupCodes,
  onDone,
}: {
  backupCodes: string[];
  onDone: () => void;
}) => {
  const { i18n } = useI18n();

  return (
    <FieldGroup>
      <BackupCodesList backupCodes={backupCodes} />

      <Alert>
        <Info />
        <AlertDescription>{i18n.two_factor.text.backup_codes_once}</AlertDescription>
      </Alert>

      <DialogFooter>
        <Button type="button" onClick={onDone}>
          {i18n.two_factor.action.done}
        </Button>
      </DialogFooter>
    </FieldGroup>
  );
};
