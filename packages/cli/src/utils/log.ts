import { log as clackLog } from "@clack/prompts";

export const log = (msg: string) => clackLog.info(msg);

export const error = (...args: unknown[]) => {
  const red = Bun.color("red", "ansi");
  const reset = "\x1b[0m";

  console.error(red, ...args, reset);
};
