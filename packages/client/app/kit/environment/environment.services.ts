import * as z from "zod";
import type { Nullable } from "@usenullish/nullish-common";
import { ENVIRONMENT } from "~/env";

export enum Environment {
  DEV = "dev",
  TEST = "test",
  DEMO = "demo",
  STAGING = "staging",
}

const EnvironmentSchema = z.enum(Environment);

export const initEnvironment = (): Nullable<Environment> => {
  const { data } = EnvironmentSchema.safeParse(ENVIRONMENT);
  return data ?? null;
};
