import { startTransition, useState, ViewTransition } from "react";
import { isNullish, type Option } from "@usenullish/nullish-common";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/ui/components/dialog";
import { NewBackupCodesPasswordForm } from "~/components/user/two-factor/new-backup-codes-password-form";
import { NewBackupCodesGenerated } from "~/components/user/two-factor/new-backup-codes-generated";
import { useI18n } from "~/kit/i18n/i18n.context";

export const NewBackupCodes = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { i18n } = useI18n();

  const [backupCodes, setBackupCodes] = useState<Option<string[]>>(undefined);

  const changeOpen = (nextOpen: boolean) => {
    if (!nextOpen) {
      setBackupCodes(undefined);
    }

    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{i18n.two_factor.text.new_backup_codes_title}</DialogTitle>
          <DialogDescription>
            {isNullish(backupCodes)
              ? i18n.two_factor.text.new_backup_codes_description
              : i18n.two_factor.text.backup_codes_saved_description}
          </DialogDescription>
        </DialogHeader>

        {isNullish(backupCodes) ? (
          <NewBackupCodesPasswordForm
            onGenerated={(generated) => startTransition(() => setBackupCodes(generated))}
          />
        ) : (
          <ViewTransition>
            <NewBackupCodesGenerated backupCodes={backupCodes} onDone={() => changeOpen(false)} />
          </ViewTransition>
        )}
      </DialogContent>
    </Dialog>
  );
};
