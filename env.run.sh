#!/usr/bin/env bash

set -euo pipefail

ENV="${1:-dev}"

if [[ "$ENV" != "dev" && "$ENV" != "test" ]]; then
  echo "Usage: $0 [dev|test]" >&2
  exit 1
fi

COMPOSE_FILE="docker-compose.${ENV}.yml"

cleanup() {
  echo
  echo "Stopping ${ENV} services..."
  docker compose -f "$COMPOSE_FILE" down
}

trap cleanup INT TERM EXIT

echo "Starting ${ENV} environment..."
docker compose -f "$COMPOSE_FILE" up