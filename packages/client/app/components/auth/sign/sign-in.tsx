import { type FormEvent, startTransition, useId, useState, ViewTransition } from "react";
import { Link, useNavigate } from "react-router";
import { nonNullish, type Nullable } from "@usenullish/nullish-common";
import { authClient } from "@usenullish/nullish-auth/client";
import { Button } from "~/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader } from "~/ui/components/card";
import { EnvironmentTag } from "~/components/core/environment-tag";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import { CenteredLayout } from "~/components/layout/centered-layout";
import { EMAIL_PLACEHOLDER } from "~/components/core/communication-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useAuthErrorMessage } from "~/kit/auth/auth-error.hook";
import { AUTH_NAVIGATION } from "~/navigation";
import { useInvitationToken } from "~/kit/auth/auth-redirect.hook";
import { useSessionExpired } from "~/kit/auth/sign-out.hook";
import { useRedirectAfterSignIn } from "~/components/auth/sign/sign-in.hooks";
import { useSettings } from "~/context/contexts/settings.context";
import { testId } from "~/kit/tests/test.utils";
import { testIds } from "~/kit/tests/test-ids.constants";

export const SignIn = () => {
  const { i18n } = useI18n();
  const authErrorMessage = useAuthErrorMessage();
  const emailId = useId();
  const passwordId = useId();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<Nullable<string>>(null);
  const [pending, setPending] = useState(false);

  const settings = useSettings();

  const expired = useSessionExpired();
  const invitationToken = useInvitationToken();

  const message = error ?? (expired ? i18n.auth.text.session_expired : null);

  const navigate = useNavigate();
  const onSignedIn = useRedirectAfterSignIn();

  const signIn = async ($event: FormEvent<HTMLFormElement>) => {
    $event.preventDefault();

    startTransition(() => setError(null));

    await authClient.signIn.email(
      {
        email,
        password,
      },
      {
        onRequest: (_ctx) => {
          setPending(true);
        },
        onSuccess: async ({ data }) => {
          if (data?.twoFactorRedirect === true) {
            await navigate(AUTH_NAVIGATION.signInTwoFactor, {
              state: nonNullish(invitationToken) ? { invitationToken } : undefined,
            });
            return;
          }

          await onSignedIn();
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

          <CardDescription>{i18n.auth.text.sign_in_description}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={signIn}>
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
                  {...testId(testIds.signIn.email)}
                />
              </Field>

              <Field>
                <div className="flex items-center">
                  <FieldLabel htmlFor={passwordId}>{i18n.auth.label.password}</FieldLabel>

                  {settings?.mail.enabled === true && (
                    <FieldDescription className="ml-auto [&>a:hover]:text-foreground">
                      <Link to={AUTH_NAVIGATION.forgotPassword}>
                        {i18n.auth.action.forgot_password}
                      </Link>
                    </FieldDescription>
                  )}
                </div>

                <Input
                  id={passwordId}
                  type="password"
                  autoComplete="current-password"
                  ignorePasswordManagers={false}
                  value={password}
                  onChange={($event) => setPassword($event.target.value)}
                  required
                  {...testId(testIds.signIn.password)}
                />
              </Field>

              {nonNullish(message) && (
                <ViewTransition>
                  <FieldError>{message}</FieldError>
                </ViewTransition>
              )}

              <Field>
                <Button type="submit" disabled={pending} {...testId(testIds.signIn.submit)}>
                  {pending ? i18n.auth.action.signing_in : i18n.auth.action.sign_in}
                </Button>

                <FieldDescription className="text-center [&>a:hover]:text-foreground">
                  {i18n.auth.text.no_account}{" "}
                  <Link
                    to={AUTH_NAVIGATION.signUp}
                    state={nonNullish(invitationToken) ? { invitationToken } : undefined}
                  >
                    {i18n.auth.action.sign_up}
                  </Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </CenteredLayout>
  );
};
