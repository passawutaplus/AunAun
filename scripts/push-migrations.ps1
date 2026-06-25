# Push pending Solo-Code migrations via Supabase Management API (Windows)
# Usage:
#   $env:SUPABASE_ACCESS_TOKEN = "sbp_..."
#   .\push-migrations.ps1

$ErrorActionPreference = "Stop"
if (-not $env:SUPABASE_ACCESS_TOKEN) {
  $tokenPath = Join-Path $env:USERPROFILE ".config\supabase\access-token"
  if (Test-Path $tokenPath) { $env:SUPABASE_ACCESS_TOKEN = (Get-Content $tokenPath -Raw).Trim() }
}
if (-not $env:SUPABASE_ACCESS_TOKEN) {
  Write-Error "Set SUPABASE_ACCESS_TOKEN or run: npx supabase login"
}
node (Join-Path $PSScriptRoot "push-migrations.mjs")
