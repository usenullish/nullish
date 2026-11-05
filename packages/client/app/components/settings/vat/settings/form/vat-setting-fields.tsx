import { useId } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { VAT_NUMBER_REGEX } from "@usenullish/nullish-common";
import { Field, FieldLabel } from "~/ui/components/field";
import { Input } from "~/ui/components/input";
import { useI18n } from "~/kit/i18n/i18n.context";

export const VatSettingFields = ({
  setting,
}: {
  setting?: Api["VatSettings"]["Client"]["VatSetting"];
}) => {
  const { i18n } = useI18n();
  const vatNumberId = useId();

  return (
    <Field>
      <FieldLabel htmlFor={vatNumberId}>{i18n.vat.label.number}</FieldLabel>
      <Input
        id={vatNumberId}
        name="vatNumber"
        placeholder={i18n.vat.label.number_placeholder}
        pattern={VAT_NUMBER_REGEX.source}
        defaultValue={setting?.vatNumber}
        required
      />
    </Field>
  );
};
