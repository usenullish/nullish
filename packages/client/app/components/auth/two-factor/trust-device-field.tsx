import { useId } from "react";
import { TWO_FACTOR_TRUST_DEVICE } from "@usenullish/nullish-auth/client";
import { Checkbox } from "~/ui/components/checkbox";
import { Field, FieldLabel } from "~/ui/components/field";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const TrustDeviceField = ({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) => {
  const { i18n } = useI18n();
  const id = useId();

  return (
    <Field orientation="horizontal">
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <FieldLabel htmlFor={id} className="font-normal">
        {replacePlaceholders(i18n.auth.label.trust_device, {
          "{days}": `${TWO_FACTOR_TRUST_DEVICE.days}`,
        })}
      </FieldLabel>
    </Field>
  );
};
