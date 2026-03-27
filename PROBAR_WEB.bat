@echo off
title Parfum Roma - Local Server
echo.
echo  =====================================================
echo     INICIANDO SERVIDOR DE PRUEBA: PARFUM ROMA
echo  =====================================================
echo.
echo  [1] Verificando instalacion de Node.js...
where node >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo  [OK] Usando Node.js (npx serve)...
    echo.
    echo  ABRIENDO EN: http://localhost:3000
    echo  (Para cerrar el servidor, cierra esta ventana o presiona CTRL+C)
    echo.
    npx -y serve .
) else (
    echo  [!] Node.js no detectado, probando Python...
    where python >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        echo  [OK] Usando Python (-m http.server)...
        echo.
        echo  ABRIENDO EN: http://localhost:8000
        start http://localhost:8000
        python -m http.server 8000
    ) else (
        echo  [!] Ni Node nor Python detectados.
        echo  Abriendo el archivo directamente en el navegador...
        start index.html
    )
)
pause
