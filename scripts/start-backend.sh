#!/usr/bin/env bash
set -e
DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$DIR/backend"
pip install -r requirements.txt -q
echo "[KubeMind AI] Starting FastAPI server on port 8000..."
python main.py
