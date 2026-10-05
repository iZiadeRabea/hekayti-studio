#requires -Version 7.0
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
$script:ProjectRoot = Split-Path -Parent $PSScriptRoot

function Invoke-Git {
    param([string[]]$Arguments, [string]$Root = $script:ProjectRoot, [switch]$AllowFailure)
    $result = @(& git -C $Root @Arguments 2>&1)
    $code = $LASTEXITCODE
    if ($code -ne 0 -and -not $AllowFailure) { throw "Git failed ($code): $($Arguments -join ' ') — $($result -join [Environment]::NewLine)" }
    return $result
}
function Get-CairoTime { [TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTimeOffset]::UtcNow, 'Egypt Standard Time') }
function Get-ProjectVersion {
    $line = Get-Content -LiteralPath "$script:ProjectRoot/CURRENT_STATE.md" | Where-Object { $_ -like '- Current project version:*' } | Select-Object -First 1
    if (-not $line) { throw 'CURRENT_STATE.md has no version' }
    return ($line -replace '^- Current project version:\s*','').Trim()
}
function Get-LatestStableTag {
    $tags = @(Invoke-Git @('tag','--list','v[0-9]*','--sort=-version:refname'))
    if ($tags.Count) { return [string]$tags[0] }
    return 'none'
}
function Get-LatestCheckpoint {
    $tags = @(Invoke-Git @('tag','--list','checkpoint/*','--sort=-creatordate'))
    if ($tags.Count) { return [string]$tags[0] }
    return 'none'
}
function Set-StateField {
    param([string]$Name,[string]$Value)
    $file = "$script:ProjectRoot/CURRENT_STATE.md"
    $content = Get-Content -Raw -LiteralPath $file
    $pattern = '(?m)^- ' + [regex]::Escape($Name) + ':.*$'
    if ($content -notmatch $pattern) { throw "Missing state field: $Name" }
    $content = [regex]::Replace($content,$pattern,{ param($m) "- ${Name}: $Value" }.GetNewClosure())
    Set-Content -LiteralPath $file -Value $content.TrimEnd() -Encoding utf8
}
function Test-PrivatePath {
    param([string]$Path)
    $p = $Path.Replace('\','/')
    if ($p -match '(?i)(^|/)(secrets|private|customer-data|child-photos|customer-uploads|local-db|private-db|temp|cache|node_modules|\.venv|venv|__pycache__|dist|build)(/|$)') { return $true }
    if ($p -match '(?i)(^|/)(uploads|generated|exports)/private(/|$)') { return $true }
    if ($p -match '(?i)(^|/)\.env($|\.)' -and $p -notmatch '(?i)(^|/)\.env\.example$') { return $true }
    if ($p -match '(?i)(^|/)(auth\.json|credentials[^/]*\.json|id_rsa[^/]*|id_ed25519[^/]*)$|\.(pem|key|p12|pfx|db|sqlite3?)$') { return $true }
    if ($p -match '^backups/' -and $p -ne 'backups/README.md') { return $true }
    return $false
}
function Get-SecretPattern {
    # Match credential bodies without printing matched text.
    return 'gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-[A-Za-z0-9_-]{24,}|AKIA[A-Z0-9]{16}|-----BEGIN [A-Z ]*PRIVATE KEY-----'
}
function Test-Security {
    param([switch]$History,[switch]$Staged)
    $refs = if ($History) { @(Invoke-Git @('rev-list','--all')) } else { @('INDEX') }
    foreach ($ref in $refs) {
        $paths = if ($ref -eq 'INDEX') { @(Invoke-Git @('ls-files','--cached')) } else { @(Invoke-Git @('ls-tree','-r','--name-only',$ref)) }
        foreach ($path in $paths) { if (Test-PrivatePath $path) { throw "Forbidden tracked path at $ref : $path" } }
        $grepArgs = @('grep','-I','-l')
        if ($ref -eq 'INDEX') { $grepArgs += '--cached' }
        $grepArgs += @('-E',(Get-SecretPattern))
        if ($ref -ne 'INDEX') { $grepArgs += $ref }
        $hits = @(& git -C $script:ProjectRoot @grepArgs 2>&1)
        if ($LASTEXITCODE -eq 0) { throw "Credential signature detected in file(s), values redacted: $($hits -join ', ')" }
        if ($LASTEXITCODE -notin 0,1) { throw "Credential scan failed: $($hits -join ', ')" }
    }
    return $true
}
function Assert-Clean {
    $status = @(Invoke-Git @('status','--porcelain'))
    if ($status.Count) { Write-Host ($status -join [Environment]::NewLine); throw 'Eligible source changes exist. Create a checkpoint/preserve work before this operation. Ignored private data is excluded.' }
}
function Test-Remote {
    param([string]$Remote = 'origin',[int]$TimeoutSeconds = 25)
    $psi = [Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = (Get-Command git).Source
    foreach ($a in @('-C',$script:ProjectRoot,'ls-remote',$Remote,'refs/heads/main','refs/tags/v*')) { $null=$psi.ArgumentList.Add($a) }
    $psi.RedirectStandardOutput=$true; $psi.RedirectStandardError=$true; $psi.UseShellExecute=$false
    $psi.Environment['GIT_TERMINAL_PROMPT']='0'
    $p=[Diagnostics.Process]::Start($psi)
    $out=$p.StandardOutput.ReadToEndAsync(); $err=$p.StandardError.ReadToEndAsync()
    if (-not $p.WaitForExit($TimeoutSeconds*1000)) { $p.Kill($true); return @{Reachable=$false;Reason='Remote timed out';Refs=@()} }
    return @{Reachable=($p.ExitCode -eq 0);Reason=$err.Result;Refs=@($out.Result -split "\r?\n" | Where-Object { $_ })}
}
function Test-ZipPaths {
    param([string]$ArchivePath)
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip=[IO.Compression.ZipFile]::OpenRead($ArchivePath)
    try {
        $seen=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
        foreach($entry in $zip.Entries) {
            $n=$entry.FullName.Replace('\','/')
            if ($n.StartsWith('/') -or $n -match '(^|/)\.\.(/|$)|:|(^|/)\.git(/|$)' -or -not $seen.Add($n)) { throw "Unsafe or duplicate archive entry: $n" }
        }
    } finally { $zip.Dispose() }
}
function Test-Package {
    param([string]$Directory)
    $manifest=Join-Path $Directory 'FILES_SHA256.json'
    if (-not (Test-Path -LiteralPath $manifest)) { throw 'File hash manifest missing' }
    $records=@(Get-Content -Raw -LiteralPath $manifest | ConvertFrom-Json)
    $allowed=[Collections.Generic.HashSet[string]]::new([StringComparer]::OrdinalIgnoreCase)
    $base=[IO.Path]::GetFullPath($Directory).TrimEnd('\','/')+[IO.Path]::DirectorySeparatorChar
    foreach($record in $records) {
        $path=[IO.Path]::GetFullPath((Join-Path $Directory $record.path))
        if (-not $path.StartsWith($base,[StringComparison]::OrdinalIgnoreCase)) { throw 'Hash manifest path escapes recovery folder' }
        if (-not $allowed.Add($record.path)) { throw 'Duplicate hash manifest path' }
        if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Missing recovery file: $($record.path)" }
        if ((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ne $record.sha256) { throw "Hash mismatch: $($record.path)" }
    }
    foreach($file in Get-ChildItem -Recurse -Force -File -LiteralPath $Directory) {
        $relative=[IO.Path]::GetRelativePath($Directory,$file.FullName).Replace('\','/')
        if ($relative -ne 'FILES_SHA256.json' -and -not $allowed.Contains($relative)) { throw "Unexpected recovery file: $relative" }
    }
    if (-not (Test-Path "$Directory/BACKUP_MANIFEST.md") -or -not (Test-Path "$Directory/git/project.bundle")) { throw 'Incomplete recovery package' }
}
