import { assertNotEmptyString, notEmptyString } from "@usenullish/nullish-common";
import { join } from "node:path";
import { type Common, CommonSchema } from "@usenullish/nullish-schema/primitives";
import { isProd } from "./mode";

const DB_NAME = "nullish";

const DEV_DB_MIGRATIONS_FOLDER = join(import.meta.dir, "..", "..", "db", "migrations");
const PROD_DB_MIGRATIONS_FOLDER = join("packages", "db", "migrations");

const envDbName = (): string => {
  const dbname = process.env.NULLISH_DB_NAME;
  return notEmptyString(dbname) ? dbname : DB_NAME;
};

const envDbHost = (): string => {
  const host = process.env.NULLISH_DB_HOST;
  assertNotEmptyString(host, "A host for the DB must be defined.");
  return host;
};

const envDbPort = (): number => {
  const port = process.env.NULLISH_DB_PORT;
  assertNotEmptyString(port, "A port for the DB must be defined.");

  const parsed = Number(port);

  if (!Number.isFinite(parsed)) {
    throw new Error(`The port for the DB must be a number, got ${port}.`);
  }

  return parsed;
};

const envDbUsername = (): string => {
  const username = process.env.NULLISH_DB_USERNAME;
  assertNotEmptyString(username, "A username for the DB must be defined.");
  return username;
};

const envDbPassword = (): string => {
  const password = process.env.NULLISH_DB_PASSWORD;
  assertNotEmptyString(password, "A password for the DB must be defined.");
  return password;
};

export const envDbUrl = (): Common["PostgresUrl"] =>
  CommonSchema.Url.PostgresUrlSchema.parse(
    `postgresql://${envDbUsername()}:${envDbPassword()}@${envDbHost()}:${envDbPort()}/${envDbName()}`,
  );

export const envDbMigrationsFolder = (): string =>
  isProd() ? PROD_DB_MIGRATIONS_FOLDER : DEV_DB_MIGRATIONS_FOLDER;
