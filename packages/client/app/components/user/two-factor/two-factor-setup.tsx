import { startTransition, useState, ViewTransition } from "react";
import { isNullish, type Option } from "@usenullish/nullish-common";
import { TwoFactorPasswordForm } from "~/components/user/two-factor/two-factor-password-form";
import { TwoFactorVerifyForm } from "~/components/user/two-factor/two-factor-verify-form";
import { TwoFactorBackupCodes } from "~/components/user/two-factor/two-factor-backup-codes";
import type { TwoFactorEnabled } from "~/components/user/two-factor/two-factor.types";

export const TwoFactorSetup = ({ closeTo }: { closeTo: string }) => {
  const [enabled, setEnabled] = useState<Option<TwoFactorEnabled>>(undefined);
  const [verified, setVerified] = useState(false);

  if (isNullish(enabled)) {
    return (
      <TwoFactorPasswordForm onEnabled={(result) => startTransition(() => setEnabled(result))} />
    );
  }

  if (!verified) {
    return (
      <ViewTransition>
        <TwoFactorVerifyForm
          totpURI={enabled.totpURI}
          onVerified={() => startTransition(() => setVerified(true))}
        />
      </ViewTransition>
    );
  }

  return (
    <ViewTransition>
      <TwoFactorBackupCodes backupCodes={enabled.backupCodes} closeTo={closeTo} />
    </ViewTransition>
  );
};
