import { type FormEvent, useId, useState, ViewTransition } from "react";
import { nonNullish } from "@usenullish/nullish-common";
import { authClient, TWO_FACTOR_BACKUP_CODE } from "@usenullish/nullish-auth/client";
import { Button } from "~/ui/components/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "~/ui/components/field";
import { REGEXP_ONLY_DIGITS_AND_CHARS } from "input-otp";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "~/ui/components/input-otp";
import { TrustDeviceField } from "~/components/auth/two-factor/trust-device-field";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useVerifyTwoFactor } from "~/components/auth/sign/sign-in-two-factor.hooks";

const slots = ({ from, to }: { from: number; to: number }) =>
  Array.from({ length: to - from }, (_, i) => (
    <InputOTPSlot
      key={from + i}
      index={from + i}
      className="aspect-square size-auto flex-1 text-sm"
    />
  ));

export const SignInBackupCodeForm = ({ onSwitch }: { onSwitch: () => void }) => {
  const { i18n } = useI18n();
  const codeId = useId();
  const { error, pending, clearError, fetchOptions, trustDevice, setTrustDevice } =
    useVerifyTwoFactor();

  const [code, setCode] = useState("");

  const verify = async ($event: FormEvent<HTMLFormElement>) => {
    $event.preventDefault();

    clearError();

    await authClient.twoFactor.verifyBackupCode(
      {
        code: `${code.slice(0, TWO_FACTOR_BACKUP_CODE.dashIndex)}-${code.slice(TWO_FACTOR_BACKUP_CODE.dashIndex)}`,
        trustDevice,
      },
      fetchOptions,
    );
  };

  return (
    <form onSubmit={verify}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={codeId}>{i18n.auth.label.backup_code}</FieldLabel>
          <InputOTP
            id={codeId}
            maxLength={TWO_FACTOR_BACKUP_CODE.length}
            pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
            pasteTransformer={(pasted) => pasted.replace(/[\s-]/g, "")}
            value={code}
            onChange={setCode}
            containerClassName="w-full"
            autoFocus
            required
          >
            <InputOTPGroup className="flex-1">
              {slots({
                from: 0,
                to: TWO_FACTOR_BACKUP_CODE.dashIndex,
              })}
            </InputOTPGroup>
            <InputOTPSeparator />
            <InputOTPGroup className="flex-1">
              {slots({
                from: TWO_FACTOR_BACKUP_CODE.dashIndex,
                to: TWO_FACTOR_BACKUP_CODE.length,
              })}
            </InputOTPGroup>
          </InputOTP>
        </Field>

        <TrustDeviceField checked={trustDevice} onCheckedChange={setTrustDevice} />

        {nonNullish(error) && (
          <ViewTransition>
            <FieldError>{error}</FieldError>
          </ViewTransition>
        )}

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.auth.action.verifying : i18n.auth.action.verify}
          </Button>

          <FieldDescription className="text-center">
            <button
              type="button"
              className="underline underline-offset-4 hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
              disabled={pending}
              onClick={onSwitch}
            >
              {i18n.auth.action.use_authenticator}
            </button>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
};
