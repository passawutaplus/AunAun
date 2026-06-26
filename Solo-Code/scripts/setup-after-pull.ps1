# Sync local machine after git pull (Windows)
# Usage: .\scripts\setup-after-pull.ps1

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

Write-Host ">> git pull origin main" -ForegroundColor Cyan
git pull origin main

Write-Host ">> npm install" -ForegroundColor Cyan
npm install

Write-Host ">> merge missing .env keys from .env.example" -ForegroundColor Cyan
node scripts/merge-env-from-example.mjs

Write-Host ""
Write-Host "Done. If Supabase still uses the old project ref, copy .env from your other PC" -ForegroundColor Yellow
Write-Host "or update keys from: https://supabase.com/dashboard/project/zkflkpbmbozrchqncpzi/settings/api" -ForegroundColor Yellow
Write-Host ""
Write-Host "Start dev server: npm run dev" -ForegroundColor Green
