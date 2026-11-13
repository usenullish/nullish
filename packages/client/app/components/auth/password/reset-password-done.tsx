import { Link } from "react-router";
import { Button } from "~/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader } from "~/ui/components/card";
import { EnvironmentTag } from "~/components/core/environment-tag";
import { Field } from "~/ui/components/field";
import { CenteredLayout } from "~/components/layout/centered-layout";
import { useI18n } from "~/kit/i18n/i18n.context";
import { AUTH_NAVIGATION } from "~/navigation";

export const ResetPasswordDone = () => {
  const { i18n } = useI18n();

  return (
    <CenteredLayout>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <EnvironmentTag className="mb-3 justify-self-end" />
          <CardDescription>{i18n.auth.text.password_reset}</CardDescription>
        </CardHeader>

        <CardContent>
          <Field>
            <Button nativeButton={false} render={<Link to={AUTH_NAVIGATION.signIn} />}>
              {i18n.auth.action.sign_in}
            </Button>
          </Field>
        </CardContent>
      </Card>
    </CenteredLayout>
  );
};
