#!/usr/bin/env bash
set -euo pipefail

PRE_DIR="./packages/db/bootstrap/pre"
POST_DIR="./packages/db/bootstrap/post"
OUT_DIR="./packages/db/migrations"

function generate_custom_sql() {
    local dir="$1"

    for filepath in "$dir"/*.sql; do
      filename=$(basename "$filepath" .sql)
      # strip a leading numeric prefix like "0001_"
      name="${filename#*_}"

      echo "Generating migration for: $name"

      sleep 1

      bun --bun drizzle-kit generate --custom --name="$name"

      generated_dir=$(ls -td "$OUT_DIR"/*_"$name" | head -n 1)

      if [ -z "$generated_dir" ]; then
        echo "Could not find generated migration folder for $name" >&2
        exit 1
      fi

      generated_file="$generated_dir/migration.sql"
      cp "$filepath" "$generated_file"

      echo "Wrote content into: $generated_file"

    done
}

# rm existing migrations script
rm -rf "$OUT_DIR"

# Custom policies, functions etc. that need to exist
# before the schema migrations with Drizzle finds place.
generate_custom_sql "$PRE_DIR"

sleep 1

# Generate SQL from code
bun --bun drizzle-kit generate --name schema_init

sleep 1

# Additional custom SQL scripts (triggers, seed data, etc.)
generate_custom_sql "$POST_DIR"

bun fmt