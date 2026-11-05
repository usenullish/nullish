import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useUser } from "~/context/hooks/auth.hooks";
import { Button } from "~/ui/components/button";
import { Badge } from "~/ui/components/badge";
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "~/ui/components/field";
import { DisableTwoFactor } from "~/components/user/two-factor/disable-two-factor";
import { NewBackupCodes } from "~/components/user/two-factor/new-backup-codes";
import { useI18n } from "~/kit/i18n/i18n.context";

export const ProfileTwoFactor = () => {
  const { i18n } = useI18n();
  const user = useUser();
  const location = useLocation();
  const [disableOpen, setDisableOpen] = useState(false);
  const [backupCodesOpen, setBackupCodesOpen] = useState(false);

  const enabled = user?.twoFactorEnabled === true;

  return (
    <FieldSet className="mt-14">
      <FieldLegend>{i18n.two_factor.text.title}</FieldLegend>
      {!enabled && <FieldDescription>{i18n.two_factor.text.disabled}</FieldDescription>}

      {enabled ? (
        <>
          <Field orientation="horizontal">
            <FieldLabel>{i18n.two_factor.label.authenticator_app}</FieldLabel>
            <Badge variant="outline">{i18n.two_factor.label.configured}</Badge>
          </Field>

          <Field>
            <Button type="button" variant="outline" onClick={() => setBackupCodesOpen(true)}>
              {i18n.two_factor.action.new_backup_codes}
            </Button>
            <Button type="button" variant="outline" onClick={() => setDisableOpen(true)}>
              {i18n.two_factor.action.turn_off}
            </Button>
            <NewBackupCodes open={backupCodesOpen} onOpenChange={setBackupCodesOpen} />
            <DisableTwoFactor open={disableOpen} onOpenChange={setDisableOpen} />
          </Field>
        </>
      ) : (
        <Field>
          <Button
            variant="outline"
            nativeButton={false}
            render={<Link to="/user/two-factor" state={{ from: location }} />}
          >
            {i18n.two_factor.action.turn_on}
          </Button>
        </Field>
      )}
    </FieldSet>
  );
};
