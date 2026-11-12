import { type FormEvent, startTransition, useId, useState, ViewTransition } from "react";
import { Link, useNavigate, useRevalidator } from "react-router";
import { isNullish, nonNullish, type Nullable } from "@usenullish/nullish-common";
import { authClient, INVITATION_TOKEN_HEADER } from "@usenullish/nullish-auth/client";
import { Button } from "~/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader } from "~/ui/components/card";
import { EnvironmentTag } from "~/components/core/environment-tag";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import { CenteredLayout } from "~/components/layout/centered-layout";
import { EMAIL_PLACEHOLDER } from "~/components/core/communication-fields";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useAuthErrorMessage } from "~/kit/auth/auth-error.hook";
import { AUTH_NAVIGATION, InvitationPath } from "~/navigation";
import { useInvitationToken } from "~/kit/auth/auth-redirect.hook";
import { testId } from "~/kit/tests/test.utils";
import { testIds } from "~/kit/tests/test-ids.constants";

export const SignUp = () => {
  const { i18n } = useI18n();
  const authErrorMessage = useAuthErrorMessage();
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<Nullable<string>>(null);
  const [pending, setPending] = useState(false);

  const invitationToken = useInvitationToken();

  const callbackURL = nonNullish(invitationToken)
    ? InvitationPath.create({ token: invitationToken }).toAccept()
    : "/orgs/new";

  const navigate = useNavigate();
  const { revalidate } = useRevalidator();

  const signUp = async ($event: FormEvent<HTMLFormElement>) => {
    $event.preventDefault();

    startTransition(() => setError(null));

    await authClient.signUp.email(
      {
        email,
        password,
        name,
        callbackURL,
      },
      {
        ...(nonNullish(invitationToken) && {
          headers: { [INVITATION_TOKEN_HEADER]: invitationToken },
        }),
        onRequest: (_ctx) => {
          setPending(true);
        },
        onSuccess: async ({ data }) => {
          if (isNullish(data?.token)) {
            await navigate(AUTH_NAVIGATION.signUpVerifyEmail, { state: { email }, replace: true });
            return;
          }

          await revalidate();
          await navigate(callbackURL, { replace: true });
        },
        onError: (ctx) => {
          setPending(false);
          startTransition(() => setError(authErrorMessage(ctx.error.message)));
        },
      },
    );
  };

  return (
    <CenteredLayout>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <EnvironmentTag className="mb-3 justify-self-end" />
          <CardDescription>{i18n.auth.text.sign_up_description}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={signUp}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor={nameId}>{i18n.core.label.name}</FieldLabel>
                <Input
                  id={nameId}
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={($event) => setName($event.target.value)}
                  required
                  {...testId(testIds.signUp.name)}
                />
              </Field>

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
                  {...testId(testIds.signUp.email)}
                />
              </Field>

              <Field>
                <FieldLabel htmlFor={passwordId}>{i18n.auth.label.password}</FieldLabel>
                <Input
                  id={passwordId}
                  type="password"
                  autoComplete="new-password"
                  ignorePasswordManagers={false}
                  value={password}
                  onChange={($event) => setPassword($event.target.value)}
                  required
                  {...testId(testIds.signUp.password)}
                />
              </Field>

              {nonNullish(error) && (
                <ViewTransition>
                  <FieldError>{error}</FieldError>
                </ViewTransition>
              )}

              <Field>
                <Button type="submit" disabled={pending} {...testId(testIds.signUp.submit)}>
                  {pending ? i18n.auth.action.signing_up : i18n.auth.action.sign_up}
                </Button>

                <FieldDescription className="text-center [&>a:hover]:text-foreground">
                  {i18n.auth.text.has_account}{" "}
                  <Link
                    to={AUTH_NAVIGATION.signIn}
                    state={nonNullish(invitationToken) ? { invitationToken } : undefined}
                  >
                    {i18n.auth.action.sign_in}
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
