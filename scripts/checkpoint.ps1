#requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param(
    [Parameter(Mandatory)][string]$Name,
    [string]$Message,
    [string]$StableTag,
    [string]$ChangeNote,
    [switch]$Push,
    [switch]$Backup
)
. "$PSScriptRoot/common.ps1"
if($Name -notmatch '^checkpoint/[a-z0-9][a-z0-9/-]*$') { throw 'Use checkpoint/descriptive-name' }
$null=Invoke-Git @('check-ref-format',"refs/tags/$Name")
if($StableTag -and $StableTag -notmatch '^v\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?$') { throw 'StableTag must be a semantic version tag' }
foreach($tag in @($Name,$StableTag) | Where-Object { $_ }) {
    $existing=@(Invoke-Git @('tag','--list',$tag))
    if($existing.Count) { throw "Tag exists and will not be moved: $tag" }
}
$branch=[string](Invoke-Git @('branch','--show-current'))
if($Push -and $branch -ne 'main') { throw 'Push option publishes main only. Merge reviewed feature work first or push its branch separately.' }
Write-Host 'Current work:'
Invoke-Git @('status','--short','--branch') | ForEach-Object { Write-Host $_ }
$null=Test-Security
if(-not $PSCmdlet.ShouldProcess($script:ProjectRoot,"Update milestone docs, stage eligible source, test, commit and create immutable $Name tag")) { return }
& "$PSScriptRoot/test.ps1"
if($LASTEXITCODE -ne 0) { throw 'Tests failed; checkpoint not committed' }
& "$PSScriptRoot/health-check.ps1" -Offline
if($LASTEXITCODE -ne 0) { throw 'Health failed; checkpoint not committed' }
$date=(Get-CairoTime).ToString('yyyy-MM-dd HH:mm:ss zzz')
Set-StateField 'Current branch at milestone' $branch
Set-StateField 'Last successful tests' "$date — foundation, design and available application suites passed; visual/packaging gates recorded separately"
if($StableTag) {
    Set-StateField 'Current project version' $StableTag
    Set-StateField 'Latest stable checkpoint' $Name
    Set-StateField 'Latest stable tag' $StableTag
}
Add-Content -LiteralPath "$script:ProjectRoot/CHECKPOINTS.md" -Value ([Environment]::NewLine+"- $date — $Name; branch $branch; stable tag: $(if($StableTag){$StableTag}else{'not marked stable'}). Resolve SHA from immutable Git tag. Tests/health passed before commit.")
if($ChangeNote) { Add-Content -LiteralPath "$script:ProjectRoot/CHANGELOG.md" -Value ([Environment]::NewLine+"### $date — $Name"+[Environment]::NewLine+$ChangeNote) }
& "$PSScriptRoot/update-context.ps1"
$null=Invoke-Git @('add','--all')
$null=Test-Security -Staged
if(-not $Message) { $Message="chore: checkpoint $Name" }
$null=Invoke-Git @('commit','-m',$Message)
$null=Invoke-Git @('tag','-a',$Name,'-m',"Checkpoint $Name; $date")
if($StableTag) { $null=Invoke-Git @('tag','-a',$StableTag,'-m',"Stable $StableTag; checkpoint $Name") }
Write-Host "PASS checkpoint committed: $(Invoke-Git @('rev-parse','HEAD'))"
if($Push) {
    $null=Test-Security -History
    $null=Invoke-Git @('push','-u','origin','main')
    $null=Invoke-Git @('push','origin',"refs/tags/$Name")
    if($StableTag) { $null=Invoke-Git @('push','origin',"refs/tags/$StableTag") }
    $remote=Test-Remote
    $sha=[string](Invoke-Git @('rev-parse','HEAD'))
    if(-not $remote.Reachable -or -not ($remote.Refs -match "^$sha\s+refs/heads/main$")) { throw 'Push returned but remote main readback did not match HEAD' }
    Write-Host 'PASS GitHub main readback matches checkpoint commit'
}
if($Backup) { & "$PSScriptRoot/backup.ps1"; if($LASTEXITCODE -ne 0){ throw 'Checkpoint preserved; backup failed' } }
