import { cancel as clackCancel } from "@clack/prompts";
import { error } from "./log";
import { nonNullish } from "@usenullish/nullish-common";

// Note about typing the function: https://stackoverflow.com/a/77545847/5404186
export const exit: ({ err, msg }: { err?: unknown; msg: string }) => never = ({ err, msg }) => {
  clackCancel(msg);

  if (nonNullish(err)) {
    error(err);
  }

  process.exit(1);
};

export const cancel: (args?: { msg: string }) => never = (
  args = { msg: "Operation cancelled" },
) => {
  clackCancel(args.msg);
  process.exit(1);
};
