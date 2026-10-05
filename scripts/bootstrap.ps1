#requires -Version 7.0
param([switch]$RestoreSkills,[switch]$Offline)
. "$PSScriptRoot/common.ps1"
if(-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Install Git for Windows first' }
$null=Invoke-Git @('rev-parse','--git-dir')
foreach($folder in @('private','secrets','customer-data','child-photos','customer-uploads','uploads/private','local-db','private-db','temp','cache','generated/private','exports/private','backups/local','backups/receipts')) {
    $null=New-Item -ItemType Directory -Path "$script:ProjectRoot/$folder" -Force
}
if(-not (Test-Path -LiteralPath "$script:ProjectRoot/.env")) {
    Copy-Item -LiteralPath "$script:ProjectRoot/.env.example" -Destination "$script:ProjectRoot/.env"
    Write-Host 'PASS created local .env from empty-key example'
} else { Write-Host 'PASS existing .env preserved' }
$hooks=@(Invoke-Git @('config','--local','--get','core.hooksPath') -AllowFailure)
if($LASTEXITCODE -eq 0 -and ($hooks -join '') -ne '.githooks') {
    Write-Host "WARNING existing hooksPath preserved: $hooks. Integrate project checks manually."
} else { $null=Invoke-Git @('config','--local','core.hooksPath','.githooks'); Write-Host 'PASS repository-local safety hooks configured' }
$inventory=Get-Content -Raw "$script:ProjectRoot/docs/skills-inventory.json" | ConvertFrom-Json
$pluginNames=@()
if(Get-Command codex -ErrorAction SilentlyContinue) {
    $raw=& codex plugin list --json
    if($LASTEXITCODE -eq 0) { $pluginNames=@(($raw -join [Environment]::NewLine | ConvertFrom-Json).installed | Where-Object { $_.enabled } | ForEach-Object { $_.name }) }
} else { Write-Host 'WARNING Codex not installed; repository recovery still works' }
foreach($item in @($inventory.skills | Where-Object { $_.vendoredPath })) {
    $local="$script:ProjectRoot/.agents/skills/$($item.name)/SKILL.md"
    $global=Join-Path $env:USERPROFILE ".codex/skills/$($item.name)/SKILL.md"
    $present=(Test-Path -LiteralPath $local) -or (Test-Path -LiteralPath $global) -or ($item.group -eq 'story-skills' -and $pluginNames -contains 'story-skills')
    if($present) { Write-Host "PASS skill available on disk/enabled plugin: $($item.name)"; continue }
    if($RestoreSkills) {
        $source=Split-Path -Parent (Join-Path $script:ProjectRoot $item.vendoredPath)
        $destination=Split-Path -Parent $local
        if(Test-Path -LiteralPath $destination) { Write-Host "WARNING incomplete existing skill preserved: $destination"; continue }
        $null=New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force
        Copy-Item -LiteralPath $source -Destination $destination -Recurse
        Write-Host "PASS restored missing skill: $($item.name)"
    } else { Write-Host "WARNING missing active skill: $($item.name); offline snapshot available; run bootstrap -RestoreSkills" }
}
& "$PSScriptRoot/health-check.ps1" -Offline:$Offline
$bootstrapHealthCode=$LASTEXITCODE
if(Test-Path -LiteralPath "$script:ProjectRoot/package.json") {
    if(Get-Command node -ErrorAction SilentlyContinue) { Write-Host "PASS Node available: $(& node --version)" }
    else { Write-Host 'WARNING install supported Node before application recovery' }
    Write-Host 'Application recovery: npm ci, npm run build, scripts/test.ps1; see docs/implementation/development-setup.md. No secrets or dependencies installed automatically.'
}
exit $bootstrapHealthCode
