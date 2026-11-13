import { Navigate } from "react-router";
import { isNullish } from "@usenullish/nullish-common";
import { Card, CardDescription, CardHeader } from "~/ui/components/card";
import { EnvironmentTag } from "~/components/core/environment-tag";
import { CenteredLayout } from "~/components/layout/centered-layout";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useAuthEmail } from "~/kit/auth/auth-redirect.hook";
import { AUTH_NAVIGATION } from "~/navigation";

export const ForgotPasswordSent = () => {
  const { i18n } = useI18n();
  const email = useAuthEmail();

  if (isNullish(email)) {
    return <Navigate to={AUTH_NAVIGATION.forgotPassword} replace />;
  }

  const [before, after] = i18n.auth.text.forgot_password_sent.split("{email}");

  return (
    <CenteredLayout>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <EnvironmentTag className="mb-3 justify-self-end" />
          <CardDescription>
            {before}
            <span className="font-medium text-foreground">{email}</span>
            {after}
          </CardDescription>
        </CardHeader>
      </Card>
    </CenteredLayout>
  );
};
