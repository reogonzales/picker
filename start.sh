#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$ROOT/.picker.pids"

# Kill any previously tracked processes
if [ -f "$PIDFILE" ]; then
  while IFS= read -r pid; do
    kill "$pid" 2>/dev/null || true
  done < "$PIDFILE"
  rm -f "$PIDFILE"
fi

# Backend
(cd "$ROOT/backend" && .venv/bin/uvicorn main:app --reload --port 8000) &
BACKEND_PID=$!

# Frontend
export PATH="/opt/homebrew/bin:$PATH"
(cd "$ROOT/frontend" && npm run dev) &
FRONTEND_PID=$!

echo "$BACKEND_PID" > "$PIDFILE"
echo "$FRONTEND_PID" >> "$PIDFILE"

echo "Picker started  backend=$BACKEND_PID  frontend=$FRONTEND_PID"
echo "Run ./stop.sh to stop."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; rm -f '$PIDFILE'" EXIT INT TERM
wait
