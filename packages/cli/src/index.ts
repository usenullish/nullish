import { isEmptyString, notEmptyString } from "@usenullish/nullish-common";
import { error, log } from "./utils/log";
import { hasArgs } from "./utils/args";
import { help } from "./help/help";
import { logVersion } from "./commands/version";
import { helpUser, user } from "./commands/user";
import { helpOrganization, organization } from "./commands/organization";

// https://zod.dev/blog/zod-4-5#zcompile
import "zod/compile";

export const run = async () => {
  const [cmd, ...args] = process.argv.slice(2);

  if (isEmptyString(cmd)) {
    error("Missing command.");
    log(help);
    return;
  }

  if (["-h", "--help"].includes(cmd)) {
    log(help);
    return;
  }

  if (["-v", "--version"].includes(cmd)) {
    await logVersion();
    return;
  }

  if (hasArgs({ args, options: ["-h", "--help"] })) {
    switch (cmd) {
      case "organization":
        helpOrganization(args);
        break;
      case "user":
        helpUser(args);
        break;
      default:
        error("Unknown command.");
        log(help);
    }
    return;
  }

  switch (cmd) {
    case "organization":
      await organization(args);
      break;
    case "user":
      await user(args);
      break;
    case "help":
      log(help);
      process.exit(0);
      break;
    default:
      error("Unknown command.");
      log(help);
      process.exit(-1);
  }
};

try {
  await run();
} catch (err: unknown) {
  error("An unexpected error happened 😫.\n");

  const prettifyError = (): string | undefined =>
    typeof err === "string" ? err : err instanceof Error ? err.message : undefined;

  const message = prettifyError();
  if (notEmptyString(message)) {
    console.log(message);
  }

  process.exit(1);
}
