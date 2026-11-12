import { type FormEvent, startTransition, useId, useState, ViewTransition } from "react";
import { CopyIcon } from "~/components/core/copy-icon";
import { QRCodeSVG } from "qrcode.react";
import { nonNullish, type Nullable } from "@usenullish/nullish-common";
import { authClient, TWO_FACTOR_TOTP } from "@usenullish/nullish-auth/client";
import { Button } from "~/ui/components/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "~/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/ui/components/input-group";
import { TotpInputOTP } from "~/components/auth/two-factor/totp-input-otp";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useAuthErrorMessage } from "~/kit/auth/auth-error.hook";
import { useCopy } from "~/kit/utils/copy.hook";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const TwoFactorVerifyForm = ({
  totpURI,
  onVerified,
}: {
  totpURI: string;
  onVerified: () => void;
}) => {
  const { i18n } = useI18n();
  const authErrorMessage = useAuthErrorMessage();
  const keyId = useId();
  const codeId = useId();

  const { copy, copied } = useCopy();

  const [code, setCode] = useState("");
  const [showSetupKey, setShowSetupKey] = useState(false);
  const [error, setError] = useState<Nullable<string>>(null);
  const [pending, setPending] = useState(false);

  const secret = new URL(totpURI).searchParams.get("secret") ?? "";

  const [beforeLink, afterLink] = i18n.two_factor.text.scan_description.split("{link}");

  const step = (number: number): string =>
    replacePlaceholders(i18n.two_factor.label.step, { "{number}": `${number}` });

  const verify = async ($event: FormEvent<HTMLFormElement>) => {
    $event.preventDefault();

    startTransition(() => setError(null));

    await authClient.twoFactor.verifyTotp(
      { code },
      {
        onRequest: () => {
          setPending(true);
        },
        onSuccess: () => {
          onVerified();
        },
        onError: ({ error }) => {
          setPending(false);
          startTransition(() => setError(authErrorMessage(error)));
        },
      },
    );
  };

  return (
    <form onSubmit={verify}>
      <FieldGroup>
        <FieldSet>
          <FieldLegend>{step(1)}</FieldLegend>
          <FieldDescription>
            {beforeLink}
            <button
              type="button"
              className="underline underline-offset-4 hover:text-foreground"
              onClick={() => startTransition(() => setShowSetupKey(true))}
            >
              {i18n.two_factor.action.show_setup_key}
            </button>
            {afterLink}
          </FieldDescription>

          <div className="flex justify-center">
            <div className="bg-white p-3">
              <QRCodeSVG value={totpURI} size={160} />
            </div>
          </div>

          {showSetupKey && (
            <ViewTransition>
              <Field>
                <FieldLabel htmlFor={keyId}>{i18n.two_factor.label.setup_key}</FieldLabel>
                <InputGroup>
                  <InputGroupInput id={keyId} value={secret} readOnly className="font-mono" />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton
                      size="icon-xs"
                      aria-label={i18n.core.action.copy}
                      onClick={() => copy(secret)}
                    >
                      <CopyIcon copied={copied} />
                    </InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </Field>
            </ViewTransition>
          )}
        </FieldSet>

        <FieldSet>
          <FieldLegend>{step(2)}</FieldLegend>
          <FieldDescription>
            {replacePlaceholders(i18n.two_factor.text.code_description, {
              "{digits}": `${TWO_FACTOR_TOTP.digits}`,
              "{period}": `${TWO_FACTOR_TOTP.period}`,
            })}
          </FieldDescription>

          <Field>
            <FieldLabel htmlFor={codeId} className="sr-only">
              {i18n.auth.label.code}
            </FieldLabel>
            <TotpInputOTP id={codeId} value={code} onChange={setCode} />
          </Field>
        </FieldSet>

        {nonNullish(error) && (
          <ViewTransition>
            <FieldError>{error}</FieldError>
          </ViewTransition>
        )}

        <Field>
          <Button type="submit" disabled={pending}>
            {pending ? i18n.auth.action.verifying : i18n.auth.action.verify}
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
};
