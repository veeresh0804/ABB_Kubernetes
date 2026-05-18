@echo off
cd /d C:\Users\manoh\Desktop\ABB\backend
set FORCE_SIMULATION_MODE=true
start "KubeMindBackend" python main.py
cd /d C:\Users\manoh\Desktop\ABB\frontend
start "KubeMindFrontend" npm run dev -- --host 0.0.0.0