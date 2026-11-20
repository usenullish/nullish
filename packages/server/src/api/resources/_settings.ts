import { nonNullish, type Nullable } from "@usenullish/nullish-common";
import { ApiSchema } from "@usenullish/nullish-schema/server";
import type { SendMail } from "@usenullish/nullish-schema/mail";
import type { ProcessPayments } from "@usenullish/nullish-schema/payments";
import { defineGetRoute } from "./_factories/crud-route-config";
import type { OpenAPIHandlerContext } from "../types/openapi";

export const settingsRoute = {
  ...defineGetRoute({
    path: "/settings",
    spec: { tag: "Settings" },
    response: {
      body: { schema: ApiSchema.Settings.GetSettingsResponseSchema },
      description: "Returns the public settings of the instance: the features it supports",
    },
  }),
  security: [],
};

type SettingsRoute = typeof settingsRoute;

export const defineSettings =
  ({ mail, payments }: { mail: Nullable<SendMail>; payments: Nullable<ProcessPayments> }) =>
  async (context: OpenAPIHandlerContext<SettingsRoute>) =>
    context.json(
      {
        settings: {
          mail: { enabled: nonNullish(mail) },
          payments: { enabled: nonNullish(payments) },
        },
      },
      200,
    );
