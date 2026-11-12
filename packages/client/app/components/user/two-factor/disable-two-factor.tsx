import { type FormEvent, startTransition, useId, useState, ViewTransition } from "react";
import { nonNullish, type Nullable } from "@usenullish/nullish-common";
import { authClient } from "@usenullish/nullish-auth/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/ui/components/alert-dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useAuthErrorMessage } from "~/kit/auth/auth-error.hook";

export const DisableTwoFactor = ({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) => {
  const { i18n } = useI18n();
  const authErrorMessage = useAuthErrorMessage();
  const passwordId = useId();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<Nullable<string>>(null);
  const [pending, setPending] = useState(false);

  const disable = async ($event: FormEvent<HTMLFormElement>) => {
    $event.preventDefault();

    startTransition(() => setError(null));

    await authClient.twoFactor.disable(
      { password },
      {
        onRequest: () => {
          setPending(true);
        },
        onSuccess: () => {
          setPending(false);
          setPassword("");
          onOpenChange(false);
        },
        onError: ({ error }) => {
          setPending(false);
          startTransition(() => setError(authErrorMessage(error)));
        },
      },
    );
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form onSubmit={disable} className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{i18n.two_factor.text.disable_title}</AlertDialogTitle>
            <AlertDialogDescription>
              {i18n.two_factor.text.disable_description}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={passwordId}>{i18n.auth.label.password}</FieldLabel>
              <Input
                id={passwordId}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={($event) => setPassword($event.target.value)}
                required
              />
            </Field>

            {nonNullish(error) && (
              <ViewTransition>
                <FieldError>{error}</FieldError>
              </ViewTransition>
            )}
          </FieldGroup>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>{i18n.core.action.cancel}</AlertDialogCancel>
            <AlertDialogAction type="submit" disabled={pending}>
              {pending ? i18n.two_factor.action.turning_off : i18n.two_factor.action.turn_off}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
};
