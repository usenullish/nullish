import { Eye, PencilLine } from "lucide-react";
import type { Api } from "@usenullish/nullish-schema/server";
import { Button } from "~/ui/components/button";
import { PromptInputAction } from "~/ui/components/prompt-input";
import { useI18n } from "~/kit/i18n/i18n.context";

type ChatDomain = Api["Chat"]["Client"]["ChatDomain"];

export const ChatReadOnlyToggle = ({
  domain,
  canWrite,
  readOnly,
  onReadOnlyChange,
}: {
  domain: ChatDomain;
  canWrite: boolean;
  readOnly: boolean;
  onReadOnlyChange: (readOnly: boolean) => void;
}) => {
  const { i18n } = useI18n();

  const locked = domain.type === "unscoped" || !canWrite;
  const writable = !locked && !readOnly;

  const tooltip =
    domain.type === "unscoped"
      ? i18n.chat.text.read_only_unscoped
      : !canWrite
        ? i18n.chat.text.read_only_reviewer
        : writable
          ? i18n.chat.text.switch_to_read_only
          : i18n.chat.text.switch_to_read_write;

  return (
    <PromptInputAction tooltip={tooltip}>
      <Button
        variant="ghost"
        size="sm"
        disabled={locked}
        focusableWhenDisabled
        className="aria-disabled:opacity-50"
        onClick={() => onReadOnlyChange(!readOnly)}
      >
        {writable ? <PencilLine aria-hidden="true" /> : <Eye aria-hidden="true" />}
        {writable ? i18n.chat.label.read_write : i18n.chat.label.read_only}
      </Button>
    </PromptInputAction>
  );
};
