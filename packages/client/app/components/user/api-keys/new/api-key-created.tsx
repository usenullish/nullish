import { useId } from "react";
import { Info } from "lucide-react";
import { CopyIcon } from "~/components/core/copy-icon";
import { Link } from "react-router";
import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { Alert, AlertDescription } from "~/ui/components/alert";
import { Field, FieldGroup, FieldLabel } from "~/ui/components/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "~/ui/components/input-group";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useCopy } from "~/kit/utils/copy.hook";

export const ApiKeyCreated = ({
  created: { key },
}: {
  created: Api["UserApiKeys"]["Client"]["CreateApiKeyResponse"];
}) => {
  const { i18n } = useI18n();
  const keyId = useId();

  const { copy: copyToClipboard, copied } = useCopy();

  const copy = async () => {
    await copyToClipboard(key);
  };

  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor={keyId}>{i18n.api_keys.text.created_title}</FieldLabel>
        <InputGroup>
          <InputGroupInput id={keyId} value={key} readOnly className="font-mono" />
          <InputGroupAddon align="inline-end">
            <InputGroupButton size="icon-xs" aria-label={i18n.core.action.copy} onClick={copy}>
              <CopyIcon copied={copied} />
            </InputGroupButton>
          </InputGroupAddon>
        </InputGroup>
      </Field>

      <Alert>
        <Info />
        <AlertDescription>{i18n.api_keys.text.created_description}</AlertDescription>
      </Alert>

      <Field>
        <Button nativeButton={false} render={<Link to="/user/api-keys" />}>
          {i18n.api_keys.action.done}
        </Button>
      </Field>
    </FieldGroup>
  );
};
