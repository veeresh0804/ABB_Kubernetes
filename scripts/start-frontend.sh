#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR/frontend"
npm install --silent
echo "[KubeMind AI] Starting Vite dev server on port 5173..."
open http://localhost:5173 2>/dev/null || xdg-open http://localhost:5173 2>/dev/null || true
npm run dev
