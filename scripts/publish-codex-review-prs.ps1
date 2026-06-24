$ErrorActionPreference = "Stop"

$gh = "C:\Program Files\GitHub CLI\gh.exe"
$branch = "codex-production-hardening-20260623"
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Assert-NativeSuccess {
  param([string]$Operation)

  if ($LASTEXITCODE -ne 0) {
    throw "$Operation failed with exit code $LASTEXITCODE."
  }
}

if (-not (Test-Path -LiteralPath $gh)) {
  throw "GitHub CLI was not found at $gh"
}

& git config --global --add safe.directory ($repositoryRoot -replace "\\", "/")
Assert-NativeSuccess "Configuring the Git safe directory"

& $gh auth setup-git
Assert-NativeSuccess "Configuring GitHub authentication"

& "$PSScriptRoot\push-codex-review-branches.ps1"

$pullRequests = @(
  @{
    Repo = "passawutaplus/AunAun"
    Title = "[codex] sync latest apps and production hardening"
    Body = @"
## Summary
- sync the latest Anthem and Solo sources
- include production security and reliability hardening
- prepare review branches for both standalone applications

## Validation
- Supabase security migration applied successfully
- Supabase Security Advisor reports 0 errors
- full local builds remain pending because the dependency cache is incomplete
"@
  },
  @{
    Repo = "passawutaplus/Anthem-Code"
    Title = "[codex] harden Anthem production and Supabase client"
    Body = @"
## Summary
- use a single underlying Supabase auth client
- retain schema-specific clients without duplicate GoTrue instances
- fix the duplicated FeedToolbar source tail
- make CI installs reproducible with the frozen lockfile

## Validation
- reviewed production-critical authentication and client initialization paths
- full local build remains pending because the dependency cache is incomplete
"@
  },
  @{
    Repo = "passawutaplus/Solo-Code"
    Title = "[codex] harden payments, SSR, CI, and Supabase"
    Body = @"
## Summary
- add Stripe transfer idempotency and payment endpoint rate limits
- validate cashout claim RPC failures
- fix hydration-sensitive theme and demo state
- replace the production localhost Anthem fallback
- add CI checks and a Supabase security migration

## Validation
- migration applied successfully to Supabase
- Supabase Security Advisor reports 0 errors
- full local build remains pending because the dependency cache is incomplete
"@
  }
)

foreach ($pullRequest in $pullRequests) {
  $existing = & $gh pr list `
    --repo $pullRequest.Repo `
    --head $branch `
    --state open `
    --json url `
    --jq ".[0].url"
  Assert-NativeSuccess "Checking pull requests for $($pullRequest.Repo)"

  if ($existing) {
    Write-Host "Draft PR already exists: $existing"
    continue
  }

  & $gh pr create `
    --repo $pullRequest.Repo `
    --base main `
    --head $branch `
    --draft `
    --title $pullRequest.Title `
    --body $pullRequest.Body
  Assert-NativeSuccess "Creating the pull request for $($pullRequest.Repo)"
}

Write-Host ""
Write-Host "GitHub publishing completed." -ForegroundColor Green
