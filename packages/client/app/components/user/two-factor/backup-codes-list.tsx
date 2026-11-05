import { CopyIcon } from "~/components/core/copy-icon";
import { Button } from "~/ui/components/button";
import { Field, FieldLabel } from "~/ui/components/field";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useCopy } from "~/kit/utils/copy.hook";

export const BackupCodesList = ({ backupCodes }: { backupCodes: string[] }) => {
  const { i18n } = useI18n();

  const { copy, copied } = useCopy();

  return (
    <Field>
      <FieldLabel>{i18n.two_factor.label.backup_codes}</FieldLabel>
      <ul className="grid grid-cols-2 gap-2 border border-input p-3 font-mono text-xs">
        {backupCodes.map((backupCode) => (
          <li key={backupCode}>{backupCode}</li>
        ))}
      </ul>
      <Button type="button" variant="outline" onClick={() => copy(backupCodes.join("\n"))}>
        <CopyIcon copied={copied} />
        {i18n.two_factor.action.copy_backup_codes}
      </Button>
    </Field>
  );
};
