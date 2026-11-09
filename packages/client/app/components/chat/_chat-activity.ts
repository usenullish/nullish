import { isNullish, type Nullish } from "@usenullish/nullish-common";
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

const LOOKING_UP = new Map<string, keyof I18n["chat"]["state"]>([
  ["invoice", "looking_up_invoices"],
  ["invoices", "looking_up_invoices"],
  ["client", "looking_up_clients"],
  ["clients", "looking_up_clients"],
  ["account", "looking_up_accounts"],
  ["accounts", "looking_up_accounts"],
  ["journal", "looking_up_journal"],
  ["bank", "looking_up_bank"],
  ["vat", "looking_up_vat"],
]);

const lookingUp = ({ subject, i18n }: { subject: Nullish<string>; i18n: I18n }): string => {
  const key = isNullish(subject) ? undefined : LOOKING_UP.get(subject);

  return isNullish(key) ? i18n.chat.state.looking_up : i18n.chat.state[key];
};

export const toolActivity = ({ name, i18n }: { name: string; i18n: I18n }): string => {
  const [action, subject] = name.split("_");

  switch (action) {
    case "get":
    case "list":
      return lookingUp({ subject, i18n });
    case "create":
      return i18n.chat.state.creating;
    case "update":
      return i18n.chat.state.updating;
    default:
      return i18n.chat.state.working;
  }
};
