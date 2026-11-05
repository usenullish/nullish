import { startTransition, useState, ViewTransition } from "react";
import { Card, CardContent, CardDescription, CardHeader } from "~/ui/components/card";
import { EnvironmentTag } from "~/components/core/environment-tag";
import { useI18n } from "~/kit/i18n/i18n.context";
import { CenteredLayout } from "~/components/layout/centered-layout";
import { SignInTotpForm } from "~/components/auth/sign/sign-in-totp-form";
import { SignInBackupCodeForm } from "~/components/auth/sign/sign-in-backup-code-form";

export const SignInTwoFactor = () => {
  const { i18n } = useI18n();

  const [withBackupCode, setWithBackupCode] = useState(false);

  const toggle = () => startTransition(() => setWithBackupCode((current) => !current));

  return (
    <CenteredLayout>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <EnvironmentTag className="mb-3 justify-self-end" />
          <CardDescription>
            {withBackupCode
              ? i18n.auth.text.backup_code_description
              : i18n.auth.text.two_factor_description}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <ViewTransition>
            {withBackupCode ? (
              <SignInBackupCodeForm onSwitch={toggle} />
            ) : (
              <SignInTotpForm onSwitch={toggle} />
            )}
          </ViewTransition>
        </CardContent>
      </Card>
    </CenteredLayout>
  );
};
