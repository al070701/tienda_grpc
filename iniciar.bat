@echo off

echo Iniciando Inventario...
start "INVENTARIO" cmd /k "python -m inventario.servidor_inventario"

timeout /t 2

echo Iniciando Pago...
start "PAGO" cmd /k "python -m pago.servidor_pago"

timeout /t 2

echo Iniciando Carrito...
start "CARRITO" cmd /k "python -m carrito.servidor_carrito"

timeout /t 2

echo Iniciando FastAPI...
start "FASTAPI" cmd /k "uvicorn web_backend.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2

echo Iniciando Tailwind...
start "TAILWIND" cmd /k "npx tailwindcss -i ./frontend/css/input.css -o ./frontend/css/output.css --watch"

echo Todo iniciado correctamente.
pause