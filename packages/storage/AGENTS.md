# storage

File storage behind a provider interface.

- `Storage` (`src/provider.ts`) is the abstraction: `put` and `get` by key, with the arguments and results typed in `nullish-schema/storage`. Providers are declared with the `@StorageProvider` decorator and a static `create()`.
- `FsStorageProvider` (`nullish-storage/fs`) stores files on the local file system, under the data dir of `nullish-env`, creating the directories of a key as needed. `get` returns the content as a stream with its content type.
- Code depends on `Storage`, not on a provider, so that another backend (e.g. object storage) can be added without changing the callers.
