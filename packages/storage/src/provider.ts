import type { Storage as StorageTypes } from "@usenullish/nullish-schema/storage";

interface Factory<T> {
  create(): T;
}

export function StorageProvider(_constructor: Factory<Storage>) {}

export abstract class Storage {
  abstract put(args: StorageTypes["Put"]["Args"]): Promise<void>;

  abstract get(args: StorageTypes["Get"]["Args"]): Promise<StorageTypes["Get"]["Result"]>;

  abstract delete(args: StorageTypes["Delete"]["Args"]): Promise<void>;
}
