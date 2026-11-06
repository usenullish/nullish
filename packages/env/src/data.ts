import { join } from "node:path";
import { isProd } from "./mode";

const DEV_DATA_DIR = join(import.meta.dir, "..", "..", "..", ".nullish", "data");

const PROD_DATA_DIR = "/data";

export const envDataDir = (): string => (isProd() ? PROD_DATA_DIR : DEV_DATA_DIR);
