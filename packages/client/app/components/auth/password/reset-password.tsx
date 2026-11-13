import { type FormEvent, startTransition, useId, useState, ViewTransition } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router";
import { isEmptyString, nonNullish, type Nullable } from "@usenullish/nullish-common";
import { authClient } from "@usenullish/nullish-auth/client";
import { Button } from "~/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader } from "~/ui/components/card";
import { EnvironmentTag } from "~/components/core/environment-tag";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import { CenteredLayout } from "~/components/layout/centered-layout";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useAuthErrorMessage } from "~/kit/auth/auth-error.hook";
import { useSettings } from "~/context/contexts/settings.context";
import { AUTH_NAVIGATION } from "~/navigation";
import { testId } from "~/kit/tests/test.utils";
import { testIds } from "~/kit/tests/test-ids.constants";

export const ResetPassword = () => {
  const { i18n } = useI18n();
  const authErrorMessage = useAuthErrorMessage();
  const settings = useSettings();
  const passwordId = useId();

  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [error, setError] = useState<Nullable<string>>(null);
  const [pending, setPending] = useState(false);

  const navigate = useNavigate();

  if (settings?.mail.enabled !== true) {
    return <Navigate to={AUTH_NAVIGATION.signIn} replace />;
  }

  if (isEmptyString(token) || searchParams.has("error")) {
    return (
      <CenteredLayout>
        <Card className="w-full max-w-sm">
          <CardHeader>
            <EnvironmentTag className="mb-3 justify-self-end" />
            <CardDescription>{i18n.auth.error.invalid_token}</CardDescription>
          </CardHeader>

          <CardContent>
            <FieldDescription className="text-center [&>a:hover]:text-foreground">
              <Link to={AUTH_NAVIGATION.forgotPassword}>{i18n.auth.action.request_new_link}</Link>
            </FieldDescription>
          </CardContent>
        </Card>
      </CenteredLayout>
    );
  }

  const resetPassword = async ($event: FormEvent<HTMLFormElement>) => {
    $event.preventDefault();

    startTransition(() => setError(null));

    await authClient.resetPassword(
      {
        newPassword: password,
        token,
      },
      {
        onRequest: (_ctx) => {
          setPending(true);
        },
        onSuccess: async (_ctx) => {
          await navigate(AUTH_NAVIGATION.resetPasswordDone, { replace: true });
        },
        onError: (ctx) => {
          setPending(false);
          startTransition(() => setError(authErrorMessage(ctx.error)));
        },
      },
    );
  };

  return (
    <CenteredLayout>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <EnvironmentTag className="mb-3 justify-self-end" />
          <CardDescription>{i18n.auth.text.reset_password_description}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={resetPassword}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={passwordId}>{i18n.auth.label.new_password}</FieldLabel>
                <Input
                  id={passwordId}
                  type="password"
                  autoComplete="new-password"
                  ignorePasswordManagers={false}
                  value={password}
                  onChange={($event) => setPassword($event.target.value)}
                  required
                  {...testId(testIds.resetPassword.password)}
                />
              </Field>

              {nonNullish(error) && (
                <ViewTransition>
                  <FieldError>{error}</FieldError>
                </ViewTransition>
              )}

              <Field>
                <Button type="submit" disabled={pending} {...testId(testIds.resetPassword.submit)}>
                  {pending ? i18n.auth.action.resetting_password : i18n.auth.action.reset_password}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </CenteredLayout>
  );
};
