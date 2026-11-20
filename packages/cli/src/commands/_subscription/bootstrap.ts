import { intro, spinner } from "@clack/prompts";
import { SubscriptionBootstrapService } from "@usenullish/nullish-admin/subscription";
import { isEmptyString, tryCatch } from "@usenullish/nullish-common";
import { withDbContext } from "../../db";
import { lime } from "../../utils/colors";
import { exit } from "../../utils/exit";

export const subscriptionBootstrap = async (args?: string[]) => {
  console.log();
  intro(lime("nullish"));

  const [, file] = args ?? [];

  if (isEmptyString(file)) {
    exit({ msg: "Missing the file to bootstrap the subscription from." });
  }

  const setup = await tryCatch(() => Bun.file(file).json());

  if (setup.status === "error") {
    exit({ msg: `Cannot read ${file}.`, err: setup.err });
  }

  const s = spinner();
  s.start("Bootstrapping the subscription");

  await withDbContext(async (dbContext) => {
    const result = await SubscriptionBootstrapService.create({
      db: dbContext.connection,
    }).bootstrap({ setup: setup.result });

    if (result.status === "error") {
      s.stop();

      exit({ msg: "Cannot bootstrap the subscription.", err: result.err });
    }

    s.stop(`Subscription bootstrapped from ${file}`);
  });
};
