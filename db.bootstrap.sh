#!/usr/bin/env bash
set -euo pipefail

BOOTSTRAP_DIR="./packages/db/bootstrap"
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

# Generate SQL from code
bun --bun drizzle-kit generate

sleep 1

# Additional custom SQL scripts (triggers, seed data, etc.)
generate_custom_sql "$BOOTSTRAP_DIR"

bun fmt