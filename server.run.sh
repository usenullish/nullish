#!/usr/bin/env bash

set -euo pipefail

ENV="${1:-dev}"

if [[ "$ENV" != "prod" ]]; then
  echo "Usage: $0 [prod]" >&2
  exit 1
fi

COMPOSE_FILE="docker-compose.${ENV}.yml"

export NULLISH_DB_USERNAME="${NULLISH_DB_USERNAME:-username}"
export NULLISH_DB_PASSWORD="${NULLISH_DB_PASSWORD:-password}"
export NULLISH_APP_URL="${NULLISH_APP_URL:-http://localhost:3000}"
export NULLISH_AUTH_SECRET="${NULLISH_AUTH_SECRET:-WexvaJiG7MqSIy8Rn8q2qIfeJ0bqkXE6vmJOu71s+38=}" # openssl rand -base64 32

echo "***************** DEV ONLY *****************"
echo "* Using NULLISH_DB_USERNAME=${NULLISH_DB_USERNAME}, ${NULLISH_DB_PASSWORD} NULLISH_APP_URL=${NULLISH_APP_URL} *"
echo "********************************************"

cleanup() {
  echo
  echo "Stopping ${ENV} stack..."
  docker compose -f "$COMPOSE_FILE" down
}

trap cleanup INT TERM EXIT

echo "Starting ${ENV} stack..."
docker compose -f "$COMPOSE_FILE" up --build
