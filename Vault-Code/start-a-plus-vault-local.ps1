$ErrorActionPreference = 'Stop'
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Server = Join-Path $Root 'outputs\a-plus-vault\local-server.cjs'

Write-Host 'Starting A+ Vault local server...'
Write-Host 'URL: http://127.0.0.1:5177/'
Start-Job -ScriptBlock {
  Start-Sleep -Seconds 1
  Start-Process 'http://127.0.0.1:5177/'
} | Out-Null
node $Server
