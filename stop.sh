#!/usr/bin/env bash
# Stop Picker backend and frontend processes

pkill -f "uvicorn main:app" 2>/dev/null && echo "Stopped backend" || echo "Backend not running"
pkill -f "vite" 2>/dev/null && echo "Stopped frontend" || echo "Frontend not running"
