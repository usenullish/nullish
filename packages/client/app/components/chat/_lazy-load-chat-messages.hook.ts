import { useEffect, useRef, useState } from "react";
import { isNullish, nonNullish, type Nullish, type Option } from "@usenullish/nullish-common";
import type { Api } from "@usenullish/nullish-schema/server";
import { QUERY_DEFAULT_PAGINATION } from "@usenullish/nullish-schema/db";
import { MessagesService } from "~/lib/services/chat+conversations+messages.services";
import { useI18n } from "~/kit/i18n/i18n.context";
import { useNotify } from "~/kit/notifications/notify.hook";

type Chat = Api["Conversations"]["Client"]["Chat"];
type Message = Api["Messages"]["Client"]["Message"];

export const useLazyLoadChatMessages = ({
  chat,
  prepend,
}: {
  chat: Nullish<Chat>;
  prepend: (messages: Message[]) => void;
}) => {
  const { i18n } = useI18n();
  const { notifyError } = useNotify();

  const sentinelRef = useRef<HTMLDivElement>(null);
  const oldestPositionRef = useRef(chat?.messages[0]?.position);
  const loadingRef = useRef<Option<Promise<void>>>(undefined);

  const [hasMore, setHasMore] = useState(chat?.messages.length === QUERY_DEFAULT_PAGINATION);
  const [loading, setLoading] = useState(false);

  const conversationId = chat?.conversation.id;

  useEffect(() => {
    const sentinel = sentinelRef.current;

    if (isNullish(sentinel) || isNullish(conversationId) || !hasMore) {
      return;
    }

    const load = async () => {
      setLoading(true);

      const result = await MessagesService.create().list({
        conversationId,
        query: {
          pagination: { limit: QUERY_DEFAULT_PAGINATION, offset: 0 },
          sort: { field: "position", direction: "desc" },
        },
        filters: { positionBefore: oldestPositionRef.current, textOnly: true },
      });

      setLoading(false);

      if (result.status === "error") {
        setHasMore(false);
        notifyError({
          msg: i18n.chat.toast.load_messages_error,
          detail: result.err,
        });
        return;
      }

      const {
        result: { messages },
      } = result;

      const older = messages.toReversed();

      prepend(older);
      oldestPositionRef.current = older[0]?.position ?? oldestPositionRef.current;
      setHasMore(messages.length === QUERY_DEFAULT_PAGINATION);
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting !== true || nonNullish(loadingRef.current)) {
        return;
      }

      loadingRef.current = load().finally(() => {
        loadingRef.current = undefined;
      });
    });

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [conversationId, hasMore, prepend, i18n, notifyError]);

  return { sentinelRef, hasMore, loading };
};
