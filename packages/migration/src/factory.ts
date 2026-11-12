import { type Result, tryCatchSync } from "@usenullish/nullish-common";
import { MigrationProvider } from "@usenullish/nullish-schema/db";
import type { ForeignAccountingProvider } from "./provider";
import { Bexio } from "./providers/bexio";

export const createForeignAccountingProvider = ({
  provider,
}: {
  provider: MigrationProvider;
}): Result<ForeignAccountingProvider> => {
  const create = (): ForeignAccountingProvider => {
    switch (provider) {
      case MigrationProvider.BEXIO: {
        return Bexio.create();
      }
      default:
        throw new Error("Unsupported provider.");
    }
  };

  return tryCatchSync(create);
};
