import { useCallback, useEffect, useRef, useState } from "react";
import type { Api } from "@usenullish/nullish-schema/server";
import { ArrowUp, LoaderCircle } from "lucide-react";
import { cn } from "cn";
import {
  nonNullish,
  notEmptyString,
  type Nullable,
  type Nullish,
} from "@usenullish/nullish-common";
import { MessageRole } from "@usenullish/nullish-schema/db";
import { ChatService } from "~/lib/services/chat.services";
import { Button } from "~/ui/components/button";
import {
  ChatContainerContent,
  ChatContainerRoot,
  ChatContainerScrollAnchor,
} from "~/ui/components/chat-container";
import { Message, MessageContent } from "~/ui/components/message";
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "~/ui/components/prompt-input";
import { TextShimmerLoader } from "~/ui/components/loader";
import { thinking, toolActivity } from "./_chat-activity";
import { useI18n } from "~/kit/i18n/i18n.context";
import { ChatReadOnlyToggle } from "~/components/chat/chat-read-only-toggle";
import { ChatFooter } from "~/components/chat/chat-footer";
import { useAssistant } from "~/context/contexts/assistant.context";
import { OrganizationRootPath } from "~/navigation";
import { replaceUrlWithoutNavigation } from "~/kit/utils/history.utils";
import { useActiveConversation } from "~/kit/chat/active-conversation.context";
import { useLazyLoadChatMessages } from "~/components/chat/_lazy-load-chat-messages.hook";
import { testId } from "~/kit/tests/test.utils";
import { testIds } from "~/kit/tests/test-ids.constants";

type ChatMessage = Api["Chat"]["Client"]["ChatMessage"];
type ChatDomain = Api["Chat"]["Client"]["ChatDomain"];
type Message = Api["Messages"]["Client"]["Message"];

const toChatMessages = (messages: Message[]): ChatMessage[] =>
  messages.flatMap(({ role, content }) =>
    role !== MessageRole.TOOL && notEmptyString(content)
      ? [{ role: role === MessageRole.USER ? "user" : "assistant", content }]
      : [],
  );

export const Chat = ({
  domain,
  canWrite = false,
  chat,
  title,
  children,
  placeholder,
  className,
}: {
  domain: ChatDomain;
  canWrite?: boolean;
  chat?: Nullish<Api["Conversations"]["Client"]["Chat"]>;
  title?: string;
  children?: React.ReactNode;
  placeholder: string;
  className?: string;
}) => {
  const { i18n } = useI18n();
  const { enabled } = useAssistant();

  const [conversationId, setConversationId] = useState<
    Api["Chat"]["Client"]["ChatRequest"]["conversationId"]
  >(chat?.conversation.id);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    toChatMessages(chat?.messages ?? []),
  );

  const [readOnly, setReadOnly] = useState(true);

  const [answer, setAnswer] = useState("");
  const streamedText = useRef("");
  const [thinkingLabel, setThinkingLabel] = useState(() => thinking({ i18n }));
  const [activity, setActivity] = useState<Nullable<string>>(null);
  const [error, setError] = useState<Nullable<string>>(null);
  const [pending, setPending] = useState(false);

  const [input, setInput] = useState("");

  const prependMessages = useCallback((older: Message[]) => {
    setMessages((current) => [...toChatMessages(older), ...current]);
  }, []);

  const { sentinelRef, hasMore, loading } = useLazyLoadChatMessages({
    chat,
    prepend: prependMessages,
  });

  const started = messages.length > 0 || pending;

  const indicator =
    pending && (answer === "" || nonNullish(activity)) ? (activity ?? thinkingLabel) : null;

  const { setActiveConversation } = useActiveConversation();

  const initialOrganizationId = domain.type === "organization" ? domain.organizationId : null;
  const initialConversationId = chat?.conversation.id;

  useEffect(() => {
    setActiveConversation(
      nonNullish(initialConversationId)
        ? { organizationId: initialOrganizationId, conversationId: initialConversationId }
        : undefined,
    );
  }, [initialOrganizationId, initialConversationId, setActiveConversation]);

  const replaceConversationPath = (id: string) => {
    setActiveConversation({ organizationId: initialOrganizationId, conversationId: id });

    if (domain.type !== "organization") {
      return;
    }

    // The stream of the first answer is ongoing - a navigation would unmount the chat.
    replaceUrlWithoutNavigation(
      OrganizationRootPath.create({ organizationId: domain.organizationId }).toConversation({
        conversationId: id,
      }),
    );
  };

  const send = async () => {
    const content = input.trim();

    if (content === "" || pending) {
      return;
    }

    setMessages((current) => [...current, { role: "user", content }]);
    setInput("");
    setError(null);
    setThinkingLabel(thinking({ i18n }));
    setPending(true);

    streamedText.current = "";

    const commitAnswer = () => {
      if (streamedText.current === "") {
        return;
      }

      const answerText = streamedText.current;

      setMessages((current) => [...current, { role: "assistant", content: answerText }]);
      setAnswer("");
      streamedText.current = "";
    };

    for await (const event of ChatService.create().stream({
      domain:
        domain.type === "organization" ? { ...domain, readOnly: readOnly || !canWrite } : domain,
      conversationId,
      message: content,
    })) {
      switch (event.type) {
        case "conversation":
          setConversationId(event.conversationId);
          replaceConversationPath(event.conversationId);
          break;
        case "text":
          streamedText.current += event.delta;
          setAnswer(streamedText.current);
          break;
        case "tool_call":
          commitAnswer();
          setActivity(toolActivity({ name: event.name, i18n }));
          break;
        case "tool_result":
        case "tool_error":
          setActivity(null);
          break;
        case "error":
          setError(event.message);
          break;
        case "limit_reached":
          setError(i18n.chat.text.limit_reached);
          break;
        case "done":
          break;
      }
    }

    commitAnswer();

    setActivity(null);
    setPending(false);
  };

  return (
    <section
      className={cn("flex h-[28rem] flex-col gap-3", !started && "justify-center", className)}
    >
      {!started && title !== undefined && (
        <h2 className="min-h-5 text-sm font-semibold">{title}</h2>
      )}

      {started && (
        <ChatContainerRoot className="min-h-0 flex-1">
          <ChatContainerContent className="gap-4 p-1">
            {hasMore && (
              <div ref={sentinelRef} className="h-px w-full shrink-0" aria-hidden="true" />
            )}

            {loading && (
              <LoaderCircle className="size-4 animate-spin self-center text-muted-foreground" />
            )}

            {messages.map(({ role, content }, index) => (
              <ChatBubble key={index} role={role} content={content} />
            ))}

            {answer !== "" && <ChatBubble role="assistant" content={answer} />}

            {nonNullish(indicator) && (
              <Message>
                <TextShimmerLoader text={indicator} size="sm" />
              </Message>
            )}

            {nonNullish(error) && (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}

            <ChatContainerScrollAnchor />
          </ChatContainerContent>
        </ChatContainerRoot>
      )}

      <PromptInput
        value={input}
        onValueChange={setInput}
        isLoading={pending}
        onSubmit={send}
        disabled={!enabled}
      >
        <PromptInputTextarea
          placeholder={enabled ? placeholder : i18n.chat.label.placeholder_disabled}
          aria-label={enabled ? placeholder : i18n.chat.label.placeholder_disabled}
          {...testId(testIds.chat.prompt)}
        />

        <PromptInputActions className="justify-end">
          <ChatReadOnlyToggle
            domain={domain}
            canWrite={canWrite}
            readOnly={readOnly}
            onReadOnlyChange={setReadOnly}
          />

          <PromptInputAction tooltip={pending ? i18n.core.state.thinking : i18n.core.action.send}>
            <Button
              size="icon"
              aria-label={i18n.core.action.send}
              disabled={!enabled || pending || input.trim() === ""}
              onClick={send}
            >
              {pending ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
            </Button>
          </PromptInputAction>
        </PromptInputActions>
      </PromptInput>

      {enabled && <ChatFooter organizationId={initialOrganizationId} started={started} />}

      {!started && children}
    </section>
  );
};

const ChatBubble = ({ role, content }: ChatMessage) =>
  role === "user" ? (
    <Message className="justify-end">
      <MessageContent className="max-w-[85%] bg-primary text-primary-foreground">
        {content}
      </MessageContent>
    </Message>
  ) : (
    <Message>
      <MessageContent markdown className="max-w-full bg-transparent p-0">
        {content}
      </MessageContent>
    </Message>
  );
