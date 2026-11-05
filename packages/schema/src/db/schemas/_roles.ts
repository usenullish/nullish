import * as pg from "drizzle-orm/pg-core";

export const authenticatedUser = pg.pgRole("authenticated_user", {
  createRole: false,
  createDb: false,
  inherit: true,
});
