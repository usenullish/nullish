import type { Api } from "@usenullish/nullish-schema/server";
import { DeleteRecord } from "~/components/core/delete-record";
import { ConversationsService } from "~/lib/services/chat+conversations.services";
import { useI18n } from "~/kit/i18n/i18n.context";
import { replacePlaceholders } from "~/kit/i18n/i18n.utils";

export const DeleteConversation = ({
  conversation,
  open,
  onOpenChange,
  onDeleted,
}: {
  conversation: Api["Conversations"]["Client"]["Conversation"];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => Promise<void>;
}) => {
  const { i18n } = useI18n();

  return (
    <DeleteRecord
      delete={() => ConversationsService.create().delete({ id: conversation.id })}
      texts={{
        title: replacePlaceholders(i18n.chat.text.delete_title, {
          "{name}": conversation.title ?? i18n.chat.text.untitled_conversation,
        }),
        description: i18n.chat.text.delete_description,
        success: i18n.chat.toast.delete_success,
        error: i18n.chat.toast.delete_error,
      }}
      open={open}
      onOpenChange={onOpenChange}
      onDeleted={onDeleted}
    />
  );
};
