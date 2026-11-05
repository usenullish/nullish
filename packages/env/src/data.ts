import { isEmptyString } from "@usenullish/nullish-common";
import { join } from "node:path";
import { isProd } from "./mode";

const DEV_DATA_DIR = join(import.meta.dir, "..", "..", "..", ".nullish", "data");

const PROD_DATA_DIR = "/data";

export const envDataDir = (): string => {
  const dataDir = process.env.NULLISH_DATA_DIR;

  if (isEmptyString(dataDir)) {
    return isProd() ? PROD_DATA_DIR : DEV_DATA_DIR;
  }

  return dataDir;
};
