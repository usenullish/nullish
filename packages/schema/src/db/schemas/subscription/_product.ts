import * as pg from "drizzle-orm/pg-core";
import type { ExtraConfigColumn, PgColumnBaseConfig } from "drizzle-orm/pg-core";
import type { ColumnType } from "drizzle-orm";
import { readonlyPolicies } from "../_policies";
import { subscriptionProvider } from "./provider";
import { PlansSchema } from "./plans";

type ProductColumn = ExtraConfigColumn<PgColumnBaseConfig<ColumnType>>;

export const productFields = () => ({
  planId: pg.uuid().notNull(),
  provider: subscriptionProvider().notNull(),
  name: pg.text().notNull(),
});

export const productRules = ({
  tableName,
  table: { planId, provider },
}: {
  tableName: string;
  table: { planId: ProductColumn; provider: ProductColumn };
}) => [
  pg
    .foreignKey({
      name: `${tableName}_plan_provider_fkey`,
      columns: [planId, provider],
      foreignColumns: [PlansSchema.id, PlansSchema.provider],
    })
    .onDelete("cascade"),
  pg.uniqueIndex(`${tableName}_plan_uidx`).on(planId),
  ...readonlyPolicies({ tableName }),
];
