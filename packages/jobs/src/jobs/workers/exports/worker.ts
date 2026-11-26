import {
  assertNonNullish,
  encodeWithCodecs,
  nonNullish,
  type Result,
  tryCatch,
} from "@usenullish/nullish-common";
import type { DbStoreInitArgs } from "@usenullish/nullish-engine";
import { DbOrganizations } from "@usenullish/nullish-engine/core";
import { DbCollectionJournal } from "@usenullish/nullish-engine/ledger";
import { DbSchema, type PostgresDbInstance } from "@usenullish/nullish-schema/db";
import { StoragePath, type Jobs } from "@usenullish/nullish-schema/jobs";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import { FsStorageProvider } from "@usenullish/nullish-storage/fs";
import { getTableConfig, type PgTable } from "drizzle-orm/pg-core";
import { join } from "node:path";
import * as z from "zod";
import { listAll } from "./_helpers/list";
import { buildExportTables } from "./_helpers/tables";

type Files = Record<string, string>;

type File = [string, string];

export class ExportsWorker {
  readonly #organizationId: Jobs["Exports"]["Payload"]["organizationId"];
  readonly #storeArgs: DbStoreInitArgs;

  private constructor({
    db,
    payload: { userId, organizationId },
  }: {
    db: PostgresDbInstance;
    payload: Jobs["Exports"]["Payload"];
  }) {
    this.#organizationId = organizationId;
    this.#storeArgs = { db, userId };
  }

  static create(args: {
    db: PostgresDbInstance;
    payload: Jobs["Exports"]["Payload"];
  }): ExportsWorker {
    return new this(args);
  }

  run(): Promise<Result<Jobs["Exports"]["Result"]>> {
    return tryCatch(async () => {
      const files = await this.#exportFiles();

      const archive = new Bun.Archive(files, { compress: "gzip" });

      const exportId = crypto.randomUUID();

      await FsStorageProvider.create().put({
        key: join(StoragePath.Organizations, this.#organizationId, `${exportId}.tar.gz`),
        body: await archive.bytes(),
      });

      return { exportId };
    });
  }

  async #exportFiles(): Promise<Files> {
    const organization = await this.#exportOrganization();

    const tables = await this.#exportTables();

    const journal = await this.#exportJournal();

    return Object.fromEntries([organization, ...tables, ...journal]);
  }

  async #exportTables(): Promise<File[]> {
    const files: File[] = [];

    for (const { collection, childCollection } of buildExportTables({
      storeArgs: this.#storeArgs,
      organizationId: this.#organizationId,
    })) {
      const rows = await collection.build();

      files.push(this.#toFile({ ...collection, rows }));

      if (nonNullish(childCollection)) {
        files.push(this.#toFile({ ...childCollection, rows: await childCollection.build(rows) }));
      }
    }

    return files;
  }

  async #exportJournal(): Promise<File[]> {
    const journal = await listAll({
      list: (query) =>
        DbCollectionJournal.create({ ...this.#storeArgs, foreignKeyId: this.#organizationId }).list(
          query,
        ),
    });

    return [
      this.#toFile({
        table: DbSchema.Ledger.Journal.JournalEntriesSchema,
        schema: ApiSchema.Journal.PostingResponseSchema.shape.entry,
        rows: journal.map(({ entry }) => entry),
      }),
      this.#toFile({
        table: DbSchema.Ledger.Journal.PostingsSchema,
        schema: ApiSchema.Journal.PostingResponseSchema.shape.postings.element,
        rows: journal.flatMap(({ postings }) => postings),
      }),
    ];
  }

  async #exportOrganization(): Promise<File> {
    const result = await DbOrganizations.create(this.#storeArgs).find({
      pKey: this.#organizationId,
    });

    if (result.status === "error") {
      throw result.err;
    }

    const { result: organization } = result;

    assertNonNullish(organization, "The organization to export was not found.");

    return this.#toFile({
      table: DbSchema.Core.Organizations.OrganizationsSchema,
      schema: ApiSchema.Organizations.OrganizationSchema,
      rows: [organization],
    });
  }

  #toFile({ table, schema, rows }: { table: PgTable; schema: z.ZodType; rows: unknown[] }): File {
    const { schema: dbSchema, name } = getTableConfig(table);

    return [
      // public as TS fallback - none of our tables are on public
      join(dbSchema ?? "public", `${name}.json`),
      JSON.stringify(encodeWithCodecs({ schema: z.array(schema), value: rows }), null, 2),
    ];
  }
}
