#!/usr/bin/env bash

set -euo pipefail

MODE="${1:-dev}"

if [[ "$MODE" != "dev" && "$MODE" != "mock" ]]; then
  echo "Usage: $0 [dev|mock]" >&2
  exit 1
fi

if [[ "$MODE" == "mock" ]]; then
  COMPOSE_ARGS=(-f "docker-compose.stripe-mock.yml")
else
  COMPOSE_ARGS=(-f "docker-compose.stripe.yml" --env-file ".env.stripe")
fi

cleanup() {
  echo
  echo "Stopping Stripe..."
  docker compose "${COMPOSE_ARGS[@]}" down
}

trap cleanup INT TERM EXIT

if [[ "$MODE" == "mock" ]]; then
  echo "Starting the Stripe mock..."
else
  echo "Forwarding the Stripe events to the server..."
fi

docker compose "${COMPOSE_ARGS[@]}" up
