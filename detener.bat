@echo off
echo Cerrando ventanas del proyecto...

taskkill /FI "WINDOWTITLE eq INVENTARIO*" /F
taskkill /FI "WINDOWTITLE eq PAGO*" /F
taskkill /FI "WINDOWTITLE eq CARRITO*" /F
taskkill /FI "WINDOWTITLE eq FASTAPI*" /F
taskkill /FI "WINDOWTITLE eq TAILWIND*" /F

echo Servicios detenidos correctamente.
pause