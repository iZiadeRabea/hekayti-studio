#requires -Version 7.0
param([switch]$Offline,[switch]$PreCommit)
. "$PSScriptRoot/common.ps1"
$fail=0; $warn=0
function Report([string]$Status,[string]$Text) {
    Write-Host "$Status $Text"
    if ($Status -eq 'FAIL') { $script:fail++ }; if ($Status -eq 'WARNING') { $script:warn++ }
}
foreach($name in @('README.md','START_HERE.md','PROJECT_CONTEXT.md','CURRENT_STATE.md','DECISIONS.md','SETUP.md','SKILLS.md','CHANGELOG.md','CHECKPOINTS.md','RESTORE.md','BACKUP.md','SECURITY.md','CONTRIBUTING_AI.md','.env.example','.gitignore','docs/SKILLS_INVENTORY.md','docs/skills-inventory.json')) {
    if(Test-Path -LiteralPath "$script:ProjectRoot/$name" -PathType Leaf) { Report PASS "document: $name" } else { Report FAIL "missing: $name" }
}
foreach($name in @('docs','scripts','prompts','skills','templates','assets','examples','tests','backups','recovery-context')) {
    if(Test-Path -LiteralPath "$script:ProjectRoot/$name" -PathType Container) { Report PASS "folder: $name" } else { Report FAIL "missing folder: $name" }
}
try {
    $null=Invoke-Git @('rev-parse','--git-dir')
    $branch=Invoke-Git @('branch','--show-current'); Report PASS "branch: $branch"
    $null=Invoke-Git @('fsck','--full'); Report PASS 'Git object integrity'
    $null=Test-Security; Report PASS 'tracked-source security scan'
    foreach($path in @('.env','.env.production','secrets/probe.txt','private/probe.txt','customer-data/probe.txt','child-photos/probe.png','customer-uploads/probe.png','uploads/private/probe.txt','local-db/probe.db','private-db/probe.txt','temp/probe.txt','cache/probe.txt','generated/private/probe.txt','exports/private/probe.txt','node_modules/probe.txt','.venv/probe.txt','venv/probe.txt','__pycache__/probe.txt','dist/probe.txt','build/probe.txt')) {
        $null=& git -C $script:ProjectRoot check-ignore --no-index $path
        if($LASTEXITCODE -ne 0) { Report FAIL "private/runtime path not ignored: $path" }
    }
    $null=& git -C $script:ProjectRoot check-ignore --no-index .env.example assets/README.md
    if($LASTEXITCODE -eq 0) { Report FAIL 'example config or source assets wrongly ignored' } else { Report PASS 'private exclusions and source inclusion' }
    $remote=@{Reachable=$false;Reason='Origin not checked';Refs=@()}
    $origin=@(Invoke-Git @('remote','get-url','origin') -AllowFailure)
    if($LASTEXITCODE -ne 0) { Report WARNING 'origin not configured' }
    elseif(($origin -join '') -notmatch '^https://github\.com/[^/]+/hekayti-studio(\.git)?$|^git@github\.com:[^/]+/hekayti-studio(\.git)?$') { Report FAIL 'unexpected repository remote (review origin)' }
    else {
        Report PASS "origin: $origin"
        if(-not $Offline) {
            $remote=Test-Remote
            if($remote.Reachable) {
                Report PASS 'GitHub reachable'
                $head=@(Invoke-Git @('rev-parse','HEAD') -AllowFailure)
                if($LASTEXITCODE -eq 0 -and $branch -eq 'main') {
                    if($remote.Refs -match ("^"+[regex]::Escape([string]$head[0])+"\s+refs/heads/main$")) { Report PASS 'remote main matches local HEAD' }
                    else { Report WARNING 'remote main differs from local HEAD; inspect/push before claiming GitHub backup' }
                }
            } else { Report WARNING "GitHub unavailable: $($remote.Reason)" }
        }
    }
    $stable=Get-LatestStableTag; $checkpoint=Get-LatestCheckpoint
    if($stable -eq 'none') { Report WARNING 'stable tag not created yet' } else { Report PASS "stable version: $stable" }
    if($checkpoint -eq 'none') { Report WARNING 'checkpoint tag not created yet' } else { Report PASS "checkpoint: $checkpoint" }
    if(-not $Offline -and $origin.Count -and $remote.Reachable) {
        foreach($tag in @($stable,$checkpoint) | Where-Object { $_ -ne 'none' }) {
            $object=[string](Invoke-Git @('rev-parse',"refs/tags/$tag"))
            if($remote.Refs -match ("^"+$object+"\s+refs/tags/"+[regex]::Escape($tag)+"$")) { Report PASS "remote tag matches: $tag" }
            else { Report WARNING "tag not verified on origin: $tag" }
        }
    }
} catch { Report FAIL "Git/security: $_" }
try {
    $config=Get-Content -Raw "$script:ProjectRoot/docs/backup-config.json" | ConvertFrom-Json
    if($config.drive.rootId -and $config.drive.folders.Recovery.id) { Report PASS "Drive connector configuration: $($config.drive.rootUrl) (cloud receipt verified separately)" }
    else { Report WARNING 'Drive destination not configured' }
    $inventory=Get-Content -Raw "$script:ProjectRoot/docs/skills-inventory.json" | ConvertFrom-Json
    foreach($item in @($inventory.skills | Where-Object { $_.vendoredPath })) {
        $path=Join-Path $script:ProjectRoot $item.vendoredPath
        if(-not (Test-Path -LiteralPath $path)) { Report FAIL "missing portable skill: $($item.name)" }
        elseif((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ne $item.sha256) { Report FAIL "portable skill changed without inventory update: $($item.name)" }
    }
    Report PASS 'portable skill inventory checked'
} catch { Report FAIL "configuration/inventory: $_" }
$result=if($fail) {'FAIL'} elseif($warn) {'WARNING'} else {'PASS'}
Write-Host "$result HEALTH CHECK — failures=$fail warnings=$warn"
if($fail) { exit 1 }; exit 0
