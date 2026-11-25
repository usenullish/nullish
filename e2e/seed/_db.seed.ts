import { type DbInstance, openDb } from "../../packages/db/src";

// For some E2E tests we need to seed the DB to test against an expected state
// that for example would need to advance time on the server and postgres.
export const openE2EDb = async (): Promise<DbInstance> => {
  const dbResult = await openDb();

  if (dbResult.status === "error") {
    throw dbResult.err;
  }

  return dbResult.result;
};
