# Sobe o backend (FastAPI) e o frontend (Vite) do Support Helper em janelas separadas.
# Uso: .\start.ps1

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$venvPython = Join-Path $backend ".venv\Scripts\python.exe"

if (-not (Test-Path $venvPython)) {
    Write-Host "Criando ambiente virtual Python em backend\.venv ..."
    python -m venv (Join-Path $backend ".venv")
    & $venvPython -m pip install --upgrade pip
    & $venvPython -m pip install -r (Join-Path $backend "requirements.txt")
}

if (-not (Test-Path (Join-Path $frontend "node_modules"))) {
    Write-Host "Instalando dependencias do frontend ..."
    Push-Location $frontend
    npm install
    Pop-Location
}

Write-Host "Iniciando backend em http://127.0.0.1:8000 ..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backend'; .\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

Write-Host "Iniciando frontend em http://localhost:5173 ..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontend'; npm run dev"

Write-Host "Pronto. Abra http://localhost:5173 no navegador."
