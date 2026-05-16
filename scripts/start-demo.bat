@echo off
echo ╔══════════════════════════════════════════════╗
echo ║         KubeMind AI — Demo Launcher          ║
║      Kubernetes Operations Intelligence       ║
╚══════════════════════════════════════════════╝
echo.
echo [1/4] Installing backend dependencies...
cd /d "%~dp0..\backend"
pip install -r requirements.txt -q
if %errorlevel% neq 0 (
    echo [ERROR] Backend dependency installation failed.
    pause
    exit /b 1
)
echo       ✓ Backend dependencies ready
echo.

echo [2/4] Starting backend server...
start "KubeMind-Backend" cmd /c "python main.py"
timeout /t 3 /nobreak >nul
echo       ✓ Backend starting on http://localhost:8000
echo.

echo [3/4] Installing frontend dependencies...
cd /d "%~dp0..\frontend"
call npm install --silent
if %errorlevel% neq 0 (
    echo [ERROR] Frontend dependency installation failed.
    pause
    exit /b 1
)
echo       ✓ Frontend dependencies ready
echo.

echo [4/4] Starting frontend dev server...
start "" http://localhost:5173
start "KubeMind-Frontend" cmd /c "npm run dev"
echo       ✓ Frontend starting on http://localhost:5173
echo.
echo ╔══════════════════════════════════════════════╗
echo ║        KubeMind AI is now running!           ║
║                                                ║
║     Frontend:  http://localhost:5173            ║
║     Backend:   http://localhost:8000            ║
║     Health:    http://localhost:8000/api/health ║
║                                                ║
║     Close this window to stop the servers.      ║
╚══════════════════════════════════════════════╝
echo.
echo Press any key to stop all servers...
pause >nul
taskkill /f /im "python.exe" /fi "WINDOWTITLE eq KubeMind-Backend" >nul 2>&1
taskkill /f /im "node.exe" /fi "WINDOWTITLE eq KubeMind-Frontend" >nul 2>&1
echo Servers stopped.
