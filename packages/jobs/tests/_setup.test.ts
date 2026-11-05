import { afterAll, describe, expect, test } from "bun:test";
import { Pool } from "pg";
import { envDbUrl } from "@usenullish/nullish-env";
import { setupJobQueuesDb } from "../src/_setup";
import { JOB_QUEUES_SCHEMA } from "../src/constants";

const dbUrl = envDbUrl();
const pool = new Pool({ connectionString: dbUrl });

afterAll(async () => {
  await pool.end();
});

describe("setupJobQueuesDb", () => {
  test("creates the job queues schema", async () => {
    await setupJobQueuesDb({ dbUrl });

    const { rows } = await pool.query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1",
      [JOB_QUEUES_SCHEMA],
    );

    expect(rows).toHaveLength(1);
  });

  test("is idempotent when run more than once", async () => {
    await setupJobQueuesDb({ dbUrl });
    await setupJobQueuesDb({ dbUrl });

    const { rows } = await pool.query(
      "SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1",
      [JOB_QUEUES_SCHEMA],
    );

    expect(rows).toHaveLength(1);
  });
});
