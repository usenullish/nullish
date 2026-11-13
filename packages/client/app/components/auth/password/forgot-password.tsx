import { type FormEvent, startTransition, useId, useState, ViewTransition } from "react";
import { Navigate, useNavigate } from "react-router";
import { nonNullish, type Nullable } from "@usenullish/nullish-common";
import { authClient } from "@usenullish/nullish-auth/client";
import { Button } from "~/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader } from "~/ui/components/card";
import { EnvironmentTag } from "~/components/core/environment-tag";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import { CenteredLayout } from "~/components/layout/centered-layout";
import { EMAIL_PLACEHOLDER } from "~/components/core/communication-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useAuthErrorMessage } from "~/kit/auth/auth-error.hook";
import { useSettings } from "~/context/contexts/settings.context";
import { AUTH_NAVIGATION } from "~/navigation";
import { testId } from "~/kit/tests/test.utils";
import { testIds } from "~/kit/tests/test-ids.constants";

export const ForgotPassword = () => {
  const { i18n } = useI18n();
  const authErrorMessage = useAuthErrorMessage();
  const settings = useSettings();
  const emailId = useId();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<Nullable<string>>(null);
  const [pending, setPending] = useState(false);

  const navigate = useNavigate();

  if (settings?.mail.enabled !== true) {
    return <Navigate to={AUTH_NAVIGATION.signIn} replace />;
  }

  const requestPasswordReset = async ($event: FormEvent<HTMLFormElement>) => {
    $event.preventDefault();

    startTransition(() => setError(null));

    await authClient.requestPasswordReset(
      {
        email,
        redirectTo: AUTH_NAVIGATION.resetPassword,
      },
      {
        onRequest: (_ctx) => {
          setPending(true);
        },
        onSuccess: async (_ctx) => {
          await navigate(AUTH_NAVIGATION.forgotPasswordSent, { state: { email } });
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
          <CardDescription>{i18n.auth.text.forgot_password_description}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={requestPasswordReset}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={emailId}>{i18n.core.label.email}</FieldLabel>
                <Input
                  id={emailId}
                  type="email"
                  autoComplete="email"
                  ignorePasswordManagers={false}
                  placeholder={EMAIL_PLACEHOLDER}
                  value={email}
                  onChange={($event) => setEmail($event.target.value)}
                  required
                  {...testId(testIds.forgotPassword.email)}
                />
              </Field>

              {nonNullish(error) && (
                <ViewTransition>
                  <FieldError>{error}</FieldError>
                </ViewTransition>
              )}

              <Field>
                <Button type="submit" disabled={pending} {...testId(testIds.forgotPassword.submit)}>
                  {pending ? i18n.auth.action.sending_link : i18n.auth.action.send_link}
                </Button>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </CenteredLayout>
  );
};
