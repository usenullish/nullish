import * as z from "zod";
import { defineGetRoute } from "./_factories/crud-route-config";
import type { OpenAPIHandlerContext } from "../types/openapi";

const HealthSchema = z.strictObject({
  status: z.literal("ok"),
});

export const healthRoute = {
  ...defineGetRoute({
    path: "/health",
    spec: { tag: "Health" },
    response: {
      body: { schema: HealthSchema },
      description: "Health check",
    },
  }),
  security: [],
};

type HealthRoute = typeof healthRoute;

export const defineHealth = async (context: OpenAPIHandlerContext<HealthRoute>) => {
  return context.json({ status: "ok" as const }, 200);
};
