import { type FormEvent, useId, useState, ViewTransition } from "react";
import { nonNullish } from "@usenullish/nullish-common";
import { authClient } from "@usenullish/nullish-auth/client";
import { Button } from "~/ui/components/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "~/ui/components/field";
import { TotpInputOTP } from "~/components/auth/two-factor/totp-input-otp";
import { TrustDeviceField } from "~/components/auth/two-factor/trust-device-field";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useVerifyTwoFactor } from "~/components/auth/sign/sign-in-two-factor.hooks";

export const SignInTotpForm = ({ onSwitch }: { onSwitch: () => void }) => {
  const { i18n } = useI18n();
  const codeId = useId();
  const { error, pending, clearError, fetchOptions, trustDevice, setTrustDevice } =
    useVerifyTwoFactor();

  const [code, setCode] = useState("");

  const verify = async ($event: FormEvent<HTMLFormElement>) => {
    $event.preventDefault();

    clearError();

    await authClient.twoFactor.verifyTotp({ code, trustDevice }, fetchOptions);
  };

  return (
    <form onSubmit={verify}>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={codeId}>{i18n.auth.label.code}</FieldLabel>
          <TotpInputOTP id={codeId} value={code} onChange={setCode} />
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
              {i18n.auth.action.use_backup_code}
            </button>
          </FieldDescription>
        </Field>
      </FieldGroup>
    </form>
  );
};
