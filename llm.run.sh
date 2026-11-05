#!/usr/bin/env bash

set -euo pipefail

# Docker on macOS can't pass the host GPU through to containers, so Ollama
# is run natively instead for development purposes and acceptable performance.

MODEL="${OLLAMA_MODEL:-qwen3.5:4b}"

# Without this, Ollama picks a context window from available VRAM (4096 here),
# which is too small for the system prompt plus MCP tool schemas and silently
# truncates them, so the model may lose sight of the tools it can call.
export OLLAMA_CONTEXT_LENGTH=32768

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama is not installed. Install it with: brew install ollama" >&2
  exit 1
fi

cleanup() {
  echo
  echo "Stopping ollama..."
  kill "$OLLAMA_PID" 2>/dev/null || true
}

trap cleanup INT TERM EXIT

echo "Starting ollama..."
ollama serve &
OLLAMA_PID=$!

# Wait for ollama to be ready before checking/pulling the model
until ollama list >/dev/null 2>&1; do
  sleep 0.5
done

if ! ollama list | grep -q "^${MODEL}"; then
  echo "Pulling ${MODEL}..."
  ollama pull "$MODEL"
fi

wait "$OLLAMA_PID"