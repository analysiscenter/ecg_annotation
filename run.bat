@echo off

set script_path="%~dp0"

echo "Launching server backend"
cd %script_path%
start /B python backend\server.py > NUL 2>&1

echo "Launching server frontend"
cd %script_path%\frontend
start /B yarn el > NUL 2>&1

exit
