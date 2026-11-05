import { createPostgresBackend, setDefaultBackendFactory, runMigrations } from "bullmq";
import { Pool } from "pg";
import { JOB_QUEUES_SCHEMA } from "./constants";
import type { JobArgs } from "./_types";

export const setupJobQueuesDb = async ({ dbUrl }: JobArgs): Promise<void> => {
  setDefaultBackendFactory(createPostgresBackend);

  const migrate = async () => {
    const pool = new Pool({ connectionString: dbUrl });
    const client = await pool.connect();

    try {
      await runMigrations(client, JOB_QUEUES_SCHEMA);
    } finally {
      client.release();
      await pool.end();
    }
  };

  await migrate();
};
