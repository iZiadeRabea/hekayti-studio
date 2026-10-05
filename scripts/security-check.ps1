#requires -Version 7.0
param([switch]$History,[switch]$Staged)
. "$PSScriptRoot/common.ps1"
try { $null=Test-Security -History:$History -Staged:$Staged; Write-Host 'PASS security: forbidden paths and credential signatures absent'; exit 0 }
catch { Write-Host "FAIL security: $_"; exit 1 }

