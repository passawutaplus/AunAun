$ErrorActionPreference = "Stop"

function Invoke-Git {
  & git @args
  if ($LASTEXITCODE -ne 0) {
    throw "Git command failed: git $($args -join ' ')"
  }
}

function Get-GitValue {
  $value = & git @args
  if ($LASTEXITCODE -ne 0) {
    throw "Git command failed: git $($args -join ' ')"
  }
  return ($value | Select-Object -Last 1).Trim()
}

function New-CompatibleCommit {
  param(
    [string]$SourceRef,
    [string]$ParentRef,
    [string]$Message
  )

  $tree = Get-GitValue rev-parse $SourceRef
  $commit = $Message | git commit-tree $tree -p $ParentRef
  if ($LASTEXITCODE -ne 0) {
    throw "Unable to create a GitHub-compatible commit for $SourceRef."
  }
  return ($commit | Select-Object -Last 1).Trim()
}

$status = & git status --porcelain
if ($LASTEXITCODE -ne 0) {
  throw "Unable to read the Git working tree."
}

if ($status) {
  throw "Working tree is not clean. Commit or stash changes before pushing."
}

$branch = "codex-production-hardening-20260623"

Invoke-Git fetch origin "+refs/heads/main:refs/remotes/origin/main" "+refs/heads/$branch`:refs/remotes/origin/$branch"
Invoke-Git fetch anthem "+refs/heads/main:refs/remotes/anthem/main" "+refs/heads/$branch`:refs/remotes/anthem/$branch"
Invoke-Git fetch solo "+refs/heads/main:refs/remotes/solo/main" "+refs/heads/$branch`:refs/remotes/solo/$branch"

$aunAunCommit = New-CompatibleCommit `
  -SourceRef "main^{tree}" `
  -ParentRef "refs/remotes/origin/main" `
  -Message "Sync latest apps and production hardening"

$anthemCommit = New-CompatibleCommit `
  -SourceRef "HEAD:Anthem-Code" `
  -ParentRef "refs/remotes/anthem/main" `
  -Message "Harden Anthem production and Supabase client"

$soloCommit = New-CompatibleCommit `
  -SourceRef "HEAD:Solo-Code" `
  -ParentRef "refs/remotes/solo/main" `
  -Message "Harden Solo payments, SSR, CI, and Supabase"

Invoke-Git push --force-with-lease origin "${aunAunCommit}:refs/heads/$branch"
Invoke-Git push --force-with-lease anthem "${anthemCommit}:refs/heads/$branch"
Invoke-Git push --force-with-lease solo "${soloCommit}:refs/heads/$branch"

Write-Host "Pushed codex-production-hardening-20260623 to AunAun, Anthem-Code, and Solo-Code."
