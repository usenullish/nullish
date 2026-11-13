import { expect } from "@playwright/test";
import { assertNonNullish, isNullish } from "../packages/common/src/asserts/nullish";
import type { Option } from "../packages/common/src/option";
import { TIMEOUT_LONG } from "./_e2e.constants";

const MAILPIT_API_URL = "http://localhost:8025/api/v1";

interface MailpitSearch {
  messages: { ID: string }[];
}

interface MailpitMessage {
  Text: string;
}

const searchUrl = ({ to }: { to: string }): string =>
  `${MAILPIT_API_URL}/search?${new URLSearchParams({ query: `to:"${to}"` })}`;

const findLatestText = async ({ to }: { to: string }): Promise<Option<string>> => {
  const { messages } = (await (await fetch(searchUrl({ to }))).json()) as MailpitSearch;

  const [latest] = messages;

  if (isNullish(latest)) {
    return undefined;
  }

  const { Text } = (await (
    await fetch(`${MAILPIT_API_URL}/message/${latest.ID}`)
  ).json()) as MailpitMessage;

  return Text;
};

export const consumeLink = async ({ to }: { to: string }): Promise<string> => {
  await expect.poll(async () => await findLatestText({ to }), TIMEOUT_LONG).toBeDefined();

  const text = await findLatestText({ to });

  const [link] = /https?:\/\/\S+/.exec(text ?? "") ?? [];

  assertNonNullish(link);

  await fetch(searchUrl({ to }), { method: "DELETE" });

  return link;
};
