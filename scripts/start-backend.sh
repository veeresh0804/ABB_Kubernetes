#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ ! -f "$DIR/.env" ]; then cp "$DIR/.env.example" "$DIR/.env"; fi
cd "$DIR/backend"
pip install -r requirements.txt -q
echo "[KubeMind AI] Starting FastAPI server on port 8000..."
python main.py
