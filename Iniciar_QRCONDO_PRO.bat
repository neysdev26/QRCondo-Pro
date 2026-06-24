@echo off
cd /d "C:\Users\Ney\Downloads\QRCONDO_PRO"
echo Gerando build web...
call npx expo export --platform web --output-dir ./dist
echo Iniciando servidor com suporte a SPA...
start /B npx serve dist -l 3000 -s
timeout /t 3 >nul
start http://localhost:3000
exit