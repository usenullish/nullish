import { REGEXP_ONLY_DIGITS } from "input-otp";
import { TWO_FACTOR_TOTP } from "@usenullish/nullish-auth/client";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "~/ui/components/input-otp";

export const TotpInputOTP = ({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) => (
  <InputOTP
    id={id}
    maxLength={TWO_FACTOR_TOTP.digits}
    pattern={REGEXP_ONLY_DIGITS}
    autoComplete="one-time-code"
    value={value}
    onChange={onChange}
    containerClassName="w-full"
    autoFocus
    required
  >
    <InputOTPGroup className="w-full">
      {Array.from({ length: TWO_FACTOR_TOTP.digits }, (_, index) => (
        <InputOTPSlot
          key={index}
          index={index}
          className="aspect-square size-auto flex-1 text-sm"
        />
      ))}
    </InputOTPGroup>
  </InputOTP>
);
