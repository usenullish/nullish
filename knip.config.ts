import { defineConfig } from "knip/config";

export default defineConfig({
  tags: ["-lintignore"],
  workspaces: {
    ".": {},
  },
  ignore: ["packages/auth/better-auth.config.ts", "packages/client/app/ui/**/*"],
  ignoreIssues: {
    "packages/schema/src/db/schemas/**/*": ["exports"],
    "packages/schema/src/records/schemas/**/*": ["exports"],
    "packages/schema/src/views/schemas/**/*": ["exports"],
    "packages/schema/src/db/views/**/*": ["files"],
    "packages/schema/src/db/materialized-views/**/*": ["files"],
    "packages/schema/src/server/api/**/*": ["duplicates"],
    "packages/engine/tests/**/*": ["files"],
  },
});
