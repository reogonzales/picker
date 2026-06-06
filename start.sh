#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# Backend
(cd "$ROOT/backend" && .venv/bin/uvicorn main:app --reload --port 8000) &
BACKEND_PID=$!

# Frontend
export PATH="/opt/homebrew/bin:$PATH"
(cd "$ROOT/frontend" && npm run dev) &
FRONTEND_PID=$!

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM
wait
