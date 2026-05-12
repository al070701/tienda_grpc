@echo off

echo Iniciando Inventario...
start cmd /k "python -m inventario.servidor_inventario"

timeout /t 2

echo Iniciando Pago...
start cmd /k "python -m pago.servidor_pago"

timeout /t 2

echo Iniciando Carrito...
start cmd /k "python -m carrito.servidor_carrito"

timeout /t 2

echo Iniciando FastAPI...
start cmd /k "uvicorn web_backend.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2

echo Iniciando Tailwind...
start cmd /k "npx tailwindcss -i ./frontend/css/input.css -o ./frontend/css/output.css --watch"

echo Todo iniciado correctamente.
pause