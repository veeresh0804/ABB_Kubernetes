#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "$0")/.." && pwd)"
if [ ! -f "$DIR/.env" ]; then cp "$DIR/.env.example" "$DIR/.env"; fi

echo "╔══════════════════════════════════════════════╗"
echo "║         KubeMind AI — Demo Launcher          ║"
echo "║      Kubernetes Operations Intelligence       ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

echo "[1/4] Installing backend dependencies..."
cd "$DIR/backend"
pip install -r requirements.txt -q
echo "      ✓ Backend dependencies ready"
echo ""

echo "[2/4] Starting backend server..."
cd "$DIR/backend"
python main.py &
BACKEND_PID=$!
sleep 3
echo "      ✓ Backend starting on http://localhost:8000"
echo ""

echo "[3/4] Installing frontend dependencies..."
cd "$DIR/frontend"
npm install --silent
echo "      ✓ Frontend dependencies ready"
echo ""

echo "[4/4] Starting frontend dev server..."
cd "$DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "      ✓ Frontend starting on http://localhost:5173"
echo ""

echo "╔══════════════════════════════════════════════╗"
echo "║        KubeMind AI is now running!           ║"
echo "║                                              ║"
echo "║     Frontend:  http://localhost:5173          ║"
echo "║     Backend:   http://localhost:8000          ║"
echo "║     Health:    http://localhost:8000/api/health"
echo "║                                              ║"
echo "║     Press Ctrl+C to stop all servers.         ║"
echo "╚══════════════════════════════════════════════╝"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Servers stopped.'" EXIT
wait
