import { type FormEvent, startTransition, useId, useState, ViewTransition } from "react";
import { nonNullish, type Nullable } from "@usenullish/nullish-common";
import { authClient } from "@usenullish/nullish-auth/client";
import { Button } from "~/ui/components/button";
import { DialogFooter } from "~/ui/components/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useAuthErrorMessage } from "~/kit/auth/auth-error.hook";

export const NewBackupCodesPasswordForm = ({
  onGenerated,
}: {
  onGenerated: (backupCodes: string[]) => void;
}) => {
  const { i18n } = useI18n();
  const authErrorMessage = useAuthErrorMessage();
  const passwordId = useId();

  const [password, setPassword] = useState("");
  const [error, setError] = useState<Nullable<string>>(null);
  const [pending, setPending] = useState(false);

  const generate = async ($event: FormEvent<HTMLFormElement>) => {
    $event.preventDefault();

    startTransition(() => setError(null));

    await authClient.twoFactor.generateBackupCodes(
      { password },
      {
        onRequest: () => {
          setPending(true);
        },
        onSuccess: ({ data }: { data: { backupCodes: string[] } }) => {
          onGenerated(data.backupCodes);
        },
        onError: ({ error }) => {
          setPending(false);
          startTransition(() => setError(authErrorMessage(error)));
        },
      },
    );
  };

  return (
    <form onSubmit={generate} className="grid gap-4">
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

      <DialogFooter>
        <Button type="submit" disabled={pending}>
          {pending
            ? i18n.two_factor.action.generating_backup_codes
            : i18n.two_factor.action.generate_backup_codes}
        </Button>
      </DialogFooter>
    </form>
  );
};
