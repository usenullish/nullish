import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { isNullish, nonNullish } from "@usenullish/nullish-common";
import { MessageRole } from "@usenullish/nullish-schema/db";
import type { Records } from "@usenullish/nullish-schema/records";
import { MAX_HISTORY_TOOL_RESULT_LENGTH } from "./_constants";

export type ChatHistoryMessage = Pick<
  Records["Chat"]["Messages"]["Insert"],
  "role" | "content" | "toolCalls" | "toolCallId"
>;

const truncate = (content: string): string =>
  content.length > MAX_HISTORY_TOOL_RESULT_LENGTH
    ? `${content.slice(0, MAX_HISTORY_TOOL_RESULT_LENGTH)}…`
    : content;

const toParam = ({
  role,
  content,
  toolCalls,
  toolCallId,
}: ChatHistoryMessage): ChatCompletionMessageParam[] => {
  switch (role) {
    case MessageRole.USER:
      return isNullish(content) ? [] : [{ role: "user", content }];
    case MessageRole.ASSISTANT:
      return [
        {
          role: "assistant",
          content: content ?? null,
          ...(nonNullish(toolCalls) && { tool_calls: toolCalls }),
        },
      ];
    case MessageRole.TOOL:
      return isNullish(toolCallId) || isNullish(content)
        ? []
        : [{ role: "tool", tool_call_id: toolCallId, content: truncate(content) }];
  }
};

export const historyToConversation = ({
  history,
}: {
  history: ChatHistoryMessage[];
}): ChatCompletionMessageParam[] => {
  const start = history.findIndex(({ role }) => role === MessageRole.USER);

  return (start === -1 ? [] : history.slice(start)).flatMap(toParam);
};
