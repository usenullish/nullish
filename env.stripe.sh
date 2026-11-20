#!/usr/bin/env bash

set -euo pipefail

COMPOSE_FILE="docker-compose.stripe.yml"
ENV_FILE=".env.stripe"

cleanup() {
  echo
  echo "Stopping Stripe..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down
}

trap cleanup INT TERM EXIT

echo "Forwarding the Stripe events to the server..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up
