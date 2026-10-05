#requires -Version 7.0
param(
    [ValidateSet('List','View','Recover','ReturnMain','GitHub','Archive')][string]$Action='List',
    [string]$Ref,
    [string]$Destination,
    [string]$ArchivePath,
    [switch]$SafetyCheckpoint
)
. "$PSScriptRoot/common.ps1"
$null=Invoke-Git @('rev-parse','--git-dir') -AllowFailure
$repositoryReady=$LASTEXITCODE -eq 0
if(-not $repositoryReady -and $Action -notin @('GitHub','Archive')) { throw 'This action requires an existing Git repository' }
$dirty=$false
if($repositoryReady) {
    $null=Invoke-Git @('status','--short','--branch') | ForEach-Object { Write-Host $_ }
    $dirty=@(Invoke-Git @('status','--porcelain')).Count -gt 0
} else { Write-Host 'WARNING no active Git repository; recovering into a new directory' }
if($Ref -and $Ref.StartsWith('-')) { throw 'Ref cannot start with an option prefix' }
if($dirty) {
    Write-Host 'WARNING current source work is uncommitted. New-folder recovery preserves it.'
    Write-Host 'Safety option: -SafetyCheckpoint (ReturnMain only), or run checkpoint.ps1 with a unique safety name before switching.'
}
switch($Action) {
    'List' { Invoke-Git @('tag','--list','v*','checkpoint/*','--sort=-creatordate'); return }
    'View' { if(-not $Ref){throw 'Ref required'}; Invoke-Git @('show','--stat','--oneline',$Ref,'--'); return }
    'ReturnMain' {
        if($dirty -and $SafetyCheckpoint) {
            $name='checkpoint/safety-'+(Get-CairoTime).ToString('yyyyMMdd-HHmmss')
            & "$PSScriptRoot/checkpoint.ps1" -Name $name -Message "chore: safety checkpoint before returning to main"
            if($LASTEXITCODE -ne 0) { throw 'Safety checkpoint failed; current work preserved' }
        }
        Assert-Clean
        $null=Invoke-Git @('switch','main')
        Write-Host 'PASS returned to main without reset/clean'; return
    }
}
if(-not $Destination) { throw 'Destination required; choose a new directory' }
$target=[IO.Path]::GetFullPath($Destination)
if(Test-Path -LiteralPath $target) { throw "Destination exists and will not be overwritten: $target" }
if($target.StartsWith([IO.Path]::GetFullPath($script:ProjectRoot)+[IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Recovery destination must be outside working repository' }
switch($Action) {
    'Recover' {
        if(-not $Ref){throw 'Ref required'}
        $commit=[string](Invoke-Git @('rev-parse','--verify',"$Ref^{commit}"))
        $null=Invoke-Git @('worktree','add','--detach',$target,$commit)
        Write-Host "PASS recovered $commit into $target; original work preserved"
    }
    'GitHub' {
        $null=& git clone 'https://github.com/iZiadeRabea/hekayti-studio.git' $target
        if($LASTEXITCODE -ne 0){throw 'Clone failed; any partial new directory preserved for inspection'}
        $null=Invoke-Git @('fsck','--full') -Root $target
        Write-Host "PASS GitHub clone: $target"
    }
    'Archive' {
        if(-not $ArchivePath){throw 'ArchivePath required'}
        $archive=[IO.Path]::GetFullPath($ArchivePath)
        Test-ZipPaths $archive
        if(Test-Path -LiteralPath "$archive.sha256") {
            $expected=((Get-Content -Raw -LiteralPath "$archive.sha256").Trim() -split '\s+')[0]
            if((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $expected) { throw 'Archive checksum mismatch' }
        } else { Write-Host 'WARNING external checksum absent; per-file hashes will still be checked' }
        $null=New-Item -ItemType Directory -Path $target
        [IO.Compression.ZipFile]::ExtractToDirectory($archive,$target)
        Test-Package $target
        $bundle="$target/git/project.bundle"
        $verificationRepo="$target/git-verification"
        $null=& git init $verificationRepo
        if($LASTEXITCODE -ne 0){throw 'Cannot create isolated bundle verification repository'}
        $null=Invoke-Git @('bundle','verify',$bundle) -Root $verificationRepo
        $null=& git clone $bundle "$target/git-history"
        if($LASTEXITCODE -ne 0){throw 'Bundle clone failed'}
        $null=Invoke-Git @('fsck','--full') -Root "$target/git-history"
        $null=Invoke-Git @('remote','set-url','origin','https://github.com/iZiadeRabea/hekayti-studio.git') -Root "$target/git-history"
        Write-Host "PASS archive recovered; source: $target/project; full Git history: $target/git-history"
    }
}
