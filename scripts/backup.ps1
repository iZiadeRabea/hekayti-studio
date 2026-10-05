#requires -Version 7.0
param([string]$DriveDestination,[ValidateSet('Recovery','Checkpoints','Releases')][string]$Category='Recovery')
. "$PSScriptRoot/common.ps1"
Assert-Clean
$null=Test-Security -History
& "$PSScriptRoot/test.ps1"
if($LASTEXITCODE -ne 0) { throw 'Tests failed; no recovery package created' }
$healthLines=@(& pwsh -NoProfile -File "$PSScriptRoot/health-check.ps1" -Offline)
if($LASTEXITCODE -ne 0) { throw 'Health failed; no recovery package created' }
$healthSummary=($healthLines | Where-Object { $_ -match '^(PASS|WARNING|FAIL) HEALTH CHECK' } | Select-Object -Last 1)
if(-not $healthSummary){throw 'Health result was not identifiable'}
Write-Host $healthSummary
$sha=[string](Invoke-Git @('rev-parse','HEAD'))
$branch=[string](Invoke-Git @('branch','--show-current'))
$version=Get-ProjectVersion; $stable=Get-LatestStableTag; $checkpoint=Get-LatestCheckpoint
$time=Get-CairoTime; $stamp=$time.ToString('yyyy-MM-dd-HHmmss')
$id="hekayti-studio-backup-$stamp-$($sha.Substring(0,8))"
$output="$script:ProjectRoot/backups/local"
$stage="$script:ProjectRoot/backups/staging/$id"
if(Test-Path -LiteralPath $stage) { throw 'Backup staging already exists; choose a new timestamp; no overwrite' }
$null=New-Item -ItemType Directory -Path "$stage/project","$stage/git",$output -Force
$sourceZip="$script:ProjectRoot/backups/staging/$id-source.zip"
$null=Invoke-Git @('archive','--format=zip',"--output=$sourceZip",'HEAD')
Test-ZipPaths $sourceZip
[IO.Compression.ZipFile]::ExtractToDirectory($sourceZip,"$stage/project")
$null=Invoke-Git @('bundle','create',"$stage/git/project.bundle",'--all')
$null=Invoke-Git @('bundle','verify',"$stage/git/project.bundle")
$manifest=@"
# BACKUP_MANIFEST

- Backup timestamp: $($time.ToString('o')) (Africa/Cairo)
- Project version: $version
- Git branch: $branch
- Git commit SHA: $sha
- Latest stable tag: $stable
- Latest checkpoint: $checkpoint
- Repository name: iZiadeRabea/hekayti-studio
- Tests: PASS — foundation and design-document/fixture suites; no application runtime suite yet
- Health check: $healthSummary (offline); cloud reachability/receipts verified separately
- Backup source: clean committed HEAD at $script:ProjectRoot
- Content: project/ source/docs/prompts/templates/skills/scripts/examples/tests/config examples/context; git/project.bundle with all reachable refs/history; FILES_SHA256.json
- Private/customer/child data: EXCLUDED; ignored data and uncommitted work not included
- Restore: verify ZIP SHA-256 and file hashes, then run project/scripts/restore.ps1 -Action Archive into a new destination or clone git/project.bundle into a fresh directory
- Cloud upload: not asserted by this manifest; consult external receipt metadata

The HEAD recorded above is authoritative. CURRENT_STATE/docs receipts describe preceding verified milestones; they cannot include their own future SHA/upload.
"@
Set-Content -LiteralPath "$stage/BACKUP_MANIFEST.md" -Value $manifest -Encoding utf8
$records=@(Get-ChildItem -Recurse -Force -File -LiteralPath $stage | ForEach-Object {
    @{path=[IO.Path]::GetRelativePath($stage,$_.FullName).Replace('\','/');sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash}
})
$records | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath "$stage/FILES_SHA256.json" -Encoding utf8
Test-Package $stage
$archive="$output/$id.zip"
if(Test-Path -LiteralPath $archive) { throw 'Archive exists; will not overwrite' }
[IO.Compression.ZipFile]::CreateFromDirectory($stage,$archive)
Test-ZipPaths $archive
$check="$script:ProjectRoot/backups/staging/$id-verify"
[IO.Compression.ZipFile]::ExtractToDirectory($archive,$check)
Test-Package $check
$hash=(Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash
$md5=(Get-FileHash -LiteralPath $archive -Algorithm MD5).Hash
Set-Content -LiteralPath "$archive.sha256" -Value "$hash  $id.zip" -Encoding utf8
Copy-Item -LiteralPath "$stage/BACKUP_MANIFEST.md" -Destination "$output/$id-manifest.md"
Copy-Item -LiteralPath "$stage/FILES_SHA256.json" -Destination "$output/$id-files.json"
$config=Get-Content -Raw "$script:ProjectRoot/docs/backup-config.json" | ConvertFrom-Json
$second=Join-Path (Split-Path -Parent $script:ProjectRoot) $config.localRecoveryFolder
$null=New-Item -ItemType Directory -Path $second -Force
foreach($file in @($archive,"$archive.sha256","$output/$id-manifest.md","$output/$id-files.json")) {
    $dest=Join-Path $second (Split-Path -Leaf $file)
    if(Test-Path -LiteralPath $dest) { throw "Secondary recovery target exists; preserved: $dest" }
    Copy-Item -LiteralPath $file -Destination $dest
    if((Get-FileHash -LiteralPath $file).Hash -ne (Get-FileHash -LiteralPath $dest).Hash) { throw 'Secondary local backup hash mismatch' }
}
$driveStatus='CONNECTOR_UPLOAD_REQUIRED'
if(-not $DriveDestination -and (Test-Path "$script:ProjectRoot/private/backup.local.json")) {
    $local=Get-Content -Raw "$script:ProjectRoot/private/backup.local.json" | ConvertFrom-Json
    $DriveDestination=$local.driveDesktopPath
}
if($DriveDestination) {
    $driveRoot=[IO.Path]::GetFullPath($DriveDestination).TrimEnd('\','/')
    $project=[IO.Path]::GetFullPath($script:ProjectRoot).TrimEnd('\','/')
    if($driveRoot -eq $project -or $driveRoot.StartsWith($project+'\',[StringComparison]::OrdinalIgnoreCase) -or $project.StartsWith($driveRoot+'\',[StringComparison]::OrdinalIgnoreCase)) { throw 'Drive destination must be separate from working repository' }
    if(-not (Test-Path -LiteralPath $driveRoot -PathType Container)) { throw 'Configured Drive Desktop destination is unavailable; local package preserved' }
    foreach($folder in @('Latest','Checkpoints','Releases','Recovery','Manifests')) { $null=New-Item -ItemType Directory -Path (Join-Path $driveRoot $folder) -Force }
    foreach($folder in @($Category,'Latest')) {
        foreach($file in @($archive,"$archive.sha256")) {
            $dest=Join-Path (Join-Path $driveRoot $folder) (Split-Path -Leaf $file)
            if(Test-Path -LiteralPath $dest) { throw "Drive copy exists; not overwritten: $dest" }
            Copy-Item -LiteralPath $file -Destination $dest
            if((Get-FileHash -LiteralPath $dest).Hash -ne (Get-FileHash -LiteralPath $file).Hash) { throw 'Drive Desktop copy hash mismatch' }
        }
    }
    foreach($file in @("$output/$id-manifest.md","$output/$id-files.json")) { Copy-Item -LiteralPath $file -Destination (Join-Path $driveRoot 'Manifests') }
    $driveStatus='LOCAL_SYNC_PENDING — connector/browser readback required'
}
$receipt=@{timestamp=$time.ToString('o');commit=$sha;archive=$archive;sha256=$hash;md5=$md5;bytes=(Get-Item -LiteralPath $archive).Length;local='PASS';secondaryLocal=$second;driveStatus=$driveStatus;driveFolderId=$config.drive.folders.$Category.id}
$receiptDir="$script:ProjectRoot/backups/receipts"; $null=New-Item -ItemType Directory -Path $receiptDir -Force
$receipt | ConvertTo-Json | Set-Content -LiteralPath "$receiptDir/$id.json" -Encoding utf8
Write-Host "PASS LOCAL BACKUP: $archive"
Write-Host "SHA256: $hash"
Write-Host "GOOGLE DRIVE: $driveStatus"
Write-Host 'No backups or staging directories were deleted. Remote uploads require separate verified receipts.'
