#requires -Version 7.0
. "$PSScriptRoot/common.ps1"
$dest=Join-Path $script:ProjectRoot 'recovery-context'
$null=New-Item -ItemType Directory -Path $dest -Force
foreach($name in @('START_HERE.md','PROJECT_CONTEXT.md','CURRENT_STATE.md','DECISIONS.md','SKILLS.md','SETUP.md','RESTORE.md')) {
    Copy-Item -LiteralPath (Join-Path $script:ProjectRoot $name) -Destination (Join-Path $dest $name)
}
Write-Host 'PASS portable context refreshed from root source of truth'

