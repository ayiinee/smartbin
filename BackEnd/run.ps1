# SmartBin Backend - Run script
# Usage: .\run.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

# Check dependencies (run: pip install -r requirements.txt if needed)
$check = python -c "import flask; import flask_cors; print('ok')" 2>$null
if (-not $check) {
    Write-Host "Dependencies missing. Run: pip install -r requirements.txt" -ForegroundColor Yellow
    Write-Host "Or use venv: python -m venv venv; .\venv\Scripts\Activate.ps1; pip install -r requirements.txt" -ForegroundColor Cyan
    exit 1
}

Write-Host "Starting SmartBin API at http://localhost:5000" -ForegroundColor Green
python app.py
