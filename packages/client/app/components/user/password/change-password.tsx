import { type FormEvent, startTransition, useId, useState, ViewTransition } from "react";
import { useNavigate } from "react-router";
import { nonNullish, type Nullable } from "@usenullish/nullish-common";
import { authClient } from "@usenullish/nullish-auth/client";
import { Button } from "~/ui/components/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useAuthErrorMessage } from "~/kit/auth/auth-error.hook";
import { useNotify } from "~/kit/notifications/notify.hook";

export const ChangePassword = ({ closeTo }: { closeTo: string }) => {
  const { i18n } = useI18n();
  const { notifySuccess } = useNotify();
  const authErrorMessage = useAuthErrorMessage();
  const currentPasswordId = useId();
  const newPasswordId = useId();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<Nullable<string>>(null);
  const [pending, setPending] = useState(false);

  const navigate = useNavigate();

  const changePassword = async ($event: FormEvent<HTMLFormElement>) => {
    $event.preventDefault();

    startTransition(() => setError(null));

    await authClient.changePassword(
      {
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      },
      {
        onRequest: (_ctx) => {
          setPending(true);
        },
        onSuccess: async (_ctx) => {
          notifySuccess({ msg: i18n.auth.toast.change_password_success });
          await navigate(closeTo, { replace: true });
        },
        onError: (ctx) => {
          setPending(false);
          startTransition(() => setError(authErrorMessage(ctx.error.message)));
        },
      },
    );
  };

  return (
    <form onSubmit={changePassword}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={currentPasswordId}>{i18n.auth.label.current_password}</FieldLabel>
          <Input
            id={currentPasswordId}
            type="password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={($event) => setCurrentPassword($event.target.value)}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={newPasswordId}>{i18n.auth.label.new_password}</FieldLabel>
          <Input
            id={newPasswordId}
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={($event) => setNewPassword($event.target.value)}
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
            {pending ? i18n.auth.action.changing_password : i18n.auth.action.change_password}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
