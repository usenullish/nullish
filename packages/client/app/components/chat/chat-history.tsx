import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  isArrayEmpty,
  isNullish,
  nonNullish,
  type Nullable,
  type Option,
} from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { QUERY_DEFAULT_PAGINATION } from "@usenullish/nullish-schema/db";
import { Button } from "~/ui/components/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "~/ui/components/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/ui/components/table";
import { ConversationsService } from "~/lib/services/chat+conversations.services";
import { DeleteConversation } from "~/components/chat/delete/delete-conversation";
import { useActiveConversation } from "~/kit/chat/active-conversation.context";
import { OrganizationRootPath, UnscopedPath } from "~/navigation";
import { useFormatDateTime } from "~/kit/format/date.hooks";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";

type Conversation = Api["Conversations"]["Client"]["Conversation"];

export const ChatHistory = ({
  organizationId,
}: {
  organizationId: Nullable<Conversation["organizationId"]>;
}) => {
  const { i18n } = useI18n();
  const { notifyError } = useNotify();
  const formatDateTime = useFormatDateTime();
  const navigate = useNavigate();
  const { activeConversation } = useActiveConversation();

  const [open, setOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [deleting, setDeleting] = useState<Option<Conversation>>(undefined);

  useEffect(() => {
    if (!open) {
      return;
    }

    const reload = async () => {
      const query = {
        pagination: { limit: QUERY_DEFAULT_PAGINATION, offset },
        sort: { field: "createdAt", direction: "desc" },
      } as const;

      const result = isNullish(organizationId)
        ? await ConversationsService.create().listUnscoped({ query })
        : await ConversationsService.create().listByOrganization({ orgId: organizationId, query });

      if (result.status === "error") {
        notifyError({ msg: i18n.chat.toast.load_conversations_error, detail: result.err });
        return;
      }

      setConversations(result.result.conversations);
    };

    void reload();
  }, [open, offset, organizationId, i18n, notifyError]);

  const select = (id: Conversation["id"]) => {
    setOpen(false);

    const path = isNullish(organizationId)
      ? UnscopedPath.create()
      : OrganizationRootPath.create({ organizationId });

    void navigate(path.toConversation({ conversationId: id }));
  };

  const range = conversations.length === 0 ? "0" : `${offset + 1}–${offset + conversations.length}`;

  return (
    <>
      <Button variant="outline" size="xs" onClick={() => setOpen(true)}>
        {i18n.chat.label.history}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{i18n.chat.label.history}</DialogTitle>
          </DialogHeader>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{i18n.chat.label.title}</TableHead>
                <TableHead className="text-right">{i18n.core.label.created_at}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>

            <TableBody>
              {isArrayEmpty(conversations) ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    {i18n.chat.text.empty}
                  </TableCell>
                </TableRow>
              ) : (
                conversations.map((conversation) => (
                  <TableRow key={conversation.id}>
                    <TableCell className="w-full max-w-0 truncate">
                      {conversation.title ?? i18n.chat.text.untitled_conversation}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap tabular-nums">
                      {formatDateTime(conversation.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="xs" onClick={() => select(conversation.id)}>
                          {i18n.core.action.open}
                        </Button>

                        {conversation.id !== activeConversation?.conversationId && (
                          <Button
                            variant="outline"
                            size="xs"
                            onClick={() => setDeleting(conversation)}
                          >
                            {i18n.core.action.delete}
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <nav className="flex items-center justify-end gap-2">
            <span className="text-xs text-muted-foreground tabular-nums">{range}</span>

            <Button
              variant="outline"
              size="icon-sm"
              aria-label={i18n.core.action.previous}
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(offset - QUERY_DEFAULT_PAGINATION, 0))}
            >
              <ChevronLeft />
            </Button>

            <Button
              variant="outline"
              size="icon-sm"
              aria-label={i18n.core.action.next}
              disabled={conversations.length < QUERY_DEFAULT_PAGINATION}
              onClick={() => setOffset(offset + QUERY_DEFAULT_PAGINATION)}
            >
              <ChevronRight />
            </Button>
          </nav>
        </DialogContent>
      </Dialog>

      {nonNullish(deleting) && (
        <DeleteConversation
          conversation={deleting}
          open
          onOpenChange={(open) => {
            if (!open) {
              setDeleting(undefined);
            }
          }}
          onDeleted={async () => {
            setConversations((current) => current.filter(({ id }) => id !== deleting.id));
            setDeleting(undefined);
          }}
        />
      )}
    </>
  );
};
