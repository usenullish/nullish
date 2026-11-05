import { isNullish } from "@usenullish/nullish-common";
import type { I18n } from "~/kit/i18n/i18n";

const THINKING = [
  "pondering",
  "mulling",
  "noodling",
] as const satisfies readonly (keyof I18n["chat"]["state"])[];

export const thinking = ({ i18n }: { i18n: I18n }): string => {
  const key = THINKING[Math.floor(Math.random() * THINKING.length)];

  return isNullish(key) ? i18n.core.state.thinking : i18n.chat.state[key];
};

export const toolActivity = ({ name, i18n }: { name: string; i18n: I18n }): string => {
  const [action] = name.split("_");

  switch (action) {
    case "get":
    case "list":
      return i18n.chat.state.looking_up;
    case "create":
      return i18n.chat.state.creating;
    case "update":
      return i18n.chat.state.updating;
    default:
      return i18n.chat.state.working;
  }
};
