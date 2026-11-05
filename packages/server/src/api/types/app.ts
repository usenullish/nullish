import { OpenAPIHono } from "@hono/zod-openapi";
import type { ApiEnv } from "./api";

export type App = OpenAPIHono<ApiEnv>;
