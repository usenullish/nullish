import { type FormEvent, startTransition, useId, useState, ViewTransition } from "react";
import { nonNullish, type Nullable } from "@usenullish/nullish-common";
import { authClient } from "@usenullish/nullish-auth/client";
import { Button } from "~/ui/components/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useAuthErrorMessage } from "~/kit/auth/auth-error.hook";
import type { TwoFactorEnabled } from "~/components/user/two-factor/two-factor.types";

export const TwoFactorPasswordForm = ({
  onEnabled,
}: {
  onEnabled: (enabled: TwoFactorEnabled) => void;
}) => {
  const { i18n } = useI18n();
  const authErrorMessage = useAuthErrorMessage();
  const passwordId = useId();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<Nullable<string>>(null);
  const [pending, setPending] = useState(false);

  const enable = async ($event: FormEvent<HTMLFormElement>) => {
    $event.preventDefault();

    startTransition(() => setError(null));

    await authClient.twoFactor.enable(
      { password },
      {
        onRequest: () => {
          setPending(true);
        },
        onSuccess: ({ data }: { data: TwoFactorEnabled }) => {
          onEnabled(data);
        },
        onError: ({ error }) => {
          setPending(false);
          startTransition(() => setError(authErrorMessage(error)));
        },
      },
    );
  };

  return (
    <form onSubmit={enable}>
      <FieldGroup>
        <FieldDescription>{i18n.two_factor.text.password_description}</FieldDescription>

        <Field>
          <FieldLabel htmlFor={passwordId}>{i18n.auth.label.password}</FieldLabel>
          <Input
            id={passwordId}
            type="password"
            autoComplete="current-password"
            ignorePasswordManagers={false}
            value={password}
            onChange={($event) => setPassword($event.target.value)}
            autoFocus
            required
          />
        </Field>

        {nonNullish(error) && (
          <ViewTransition>
            <FieldError>{error}</FieldError>
          </ViewTransition>
        )}

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.two_factor.action.continuing : i18n.two_factor.action.continue}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
