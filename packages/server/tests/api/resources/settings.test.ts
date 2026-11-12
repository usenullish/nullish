import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { type DbInstance, openDb } from "@usenullish/nullish-db";
import type { Nullable } from "@usenullish/nullish-common";
import type { TriggerJobs } from "@usenullish/nullish-schema/jobs";
import type { SendMail } from "@usenullish/nullish-schema/mail";
import { FsStorageProvider } from "@usenullish/nullish-storage/fs";
import { defineApi } from "../../../src/api";

describe("settings", () => {
  let instance: DbInstance;

  const getSettings = async ({ mail }: { mail: Nullable<SendMail> }) => {
    const { fetch } = defineApi({
      db: instance,
      jobs: {} as TriggerJobs,
      storage: FsStorageProvider.create(),
      mail,
    });

    return await fetch(new Request("http://localhost/settings"));
  };

  beforeAll(async () => {
    const opened = await openDb();

    if (opened.status === "error") {
      throw opened.err;
    }

    instance = opened.result;
  });

  afterAll(async () => {
    await instance.close();
  });

  test("is public", async () => {
    const response = await getSettings({ mail: null });

    expect(response.status).toBe(200);
  });

  test("enables the mail with a mail provider", async () => {
    const response = await getSettings({ mail: { send: async () => {} } });

    expect(await response.json()).toEqual({ settings: { mail: { enabled: true } } });
  });

  test("disables the mail without a mail provider", async () => {
    const response = await getSettings({ mail: null });

    expect(await response.json()).toEqual({ settings: { mail: { enabled: false } } });
  });
});
