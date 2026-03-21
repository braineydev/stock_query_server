@echo off
echo Killing any existing Python processes on port 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5000 ^| findstr LISTENING') do (
    taskkill /F /PID %%a 2>nul
)

echo Waiting for port to be released...
timeout /t 2 /nobreak >nul

echo Starting Flask server...
cd /d "%~dp0"
python app.py
