@echo off

set script_path="%~dp0"

cd %script_path%\frontend
start /B yarn "el:start" > NUL 2>&1

cd %script_path%
start /B python backend\server.py > NUL 2>&1

exit
