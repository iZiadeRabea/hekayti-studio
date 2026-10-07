#requires -Version 7.0
param([ValidateSet('Run','Verify')][string]$Mode='Verify',[Parameter(Mandatory)][string]$Evidence,[string]$Log)
$ErrorActionPreference='Stop'
$evidenceRoot=Split-Path -Parent $PSScriptRoot
function Input-Fingerprint {
    $eligible=@(& git -C $evidenceRoot ls-files --cached --others --exclude-standard)
    if($LASTEXITCODE -ne 0){throw 'Cannot enumerate tested source'}
    # Documentation is excluded only from APPLICATION reuse. Foundation/design
    # and typecheck still execute normally; restore never supplies reuse evidence.
    $inputs=@($eligible | Where-Object {$_ -match '^(apps/|packages/|tests/app/|examples/|prompts/|templates/|assets/|scripts/|package(?:-lock)?\.json$|tsconfig[^/]*\.json$|\.npmrc$)' -or ($_ -like 'docs/*' -and [IO.Path]::GetExtension($_) -ne '.md') } | Sort-Object -Unique)
    if($inputs.Count -lt 10){throw 'Incomplete application input tree'}
    $records=@($inputs | ForEach-Object { $p=Join-Path $evidenceRoot $_; if(-not(Test-Path -LiteralPath $p -PathType Leaf)){throw 'Application input missing'}; $_+':'+(Get-FileHash -LiteralPath $p -Algorithm SHA256).Hash })
    $nodePath=(Get-Command node -ErrorAction Stop).Source
    $records+= 'node:'+ (Get-FileHash -LiteralPath $nodePath -Algorithm SHA256).Hash
    $installed=Join-Path $evidenceRoot 'node_modules/.package-lock.json'
    if(-not(Test-Path -LiteralPath $installed)){throw 'Installed dependency lock missing'}
    $records+= 'installed-lock:'+(Get-FileHash -LiteralPath $installed -Algorithm SHA256).Hash
    $bytes=[Text.Encoding]::UTF8.GetBytes(($records -join "`n"))
    [Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($bytes))
}
function Check-Log([string]$Path) {
    if(-not(Test-Path -LiteralPath $Path -PathType Leaf)){throw 'Application test log missing'}
    $content=Get-Content -LiteralPath $Path -Raw
    $counts=@{}
    foreach($key in @('tests','pass','fail','cancelled','skipped','todo')) {
        $matches=[regex]::Matches($content,"(?m)^# $key (\d+)\s*$")
        if($matches.Count -ne 1){throw 'Malformed application test summary'}
        $counts[$key]=[int]$matches[0].Groups[1].Value
    }
    if($counts.tests -lt 300 -or $counts.pass -ne $counts.tests -or $counts.fail -ne 0 -or $counts.cancelled -ne 0 -or $counts.skipped -ne 0 -or $counts.todo -ne 0){throw 'Application test evidence must be a complete successful unskipped run'}
    $counts
}
if($Mode -eq 'Run') {
    if(-not $Log){throw 'A new log path is required'}
    if(Test-Path -LiteralPath $Evidence){throw 'Evidence already exists; never overwrite'}
    if(Test-Path -LiteralPath $Log){throw 'Run log already exists; old logs cannot become fresh evidence'}
    $beforeHash=Input-Fingerprint
    $startedAt=[DateTimeOffset]::UtcNow.ToString('o')
    Push-Location $evidenceRoot
    try { & npm test *> $Log; $runExit=$LASTEXITCODE } finally { Pop-Location }
    if($runExit -ne 0){throw 'Fresh application invocation failed; no reuse evidence recorded'}
    $afterHash=Input-Fingerprint
    if($beforeHash -ne $afterHash){throw 'Application inputs changed during tests; no reuse evidence recorded'}
    $counts=Check-Log $Log
    @{schema='hekayti-application-evidence/2';status='PASS';command='npm test';exitCode=$runExit;inputHash=$beforeHash;afterHash=$afterHash;logPath=(Resolve-Path -LiteralPath $Log).Path;logHash=(Get-FileHash -LiteralPath $Log -Algorithm SHA256).Hash;tests=$counts.tests;startedAt=$startedAt;completedAt=[DateTimeOffset]::UtcNow.ToString('o')} | ConvertTo-Json | Set-Content -LiteralPath $Evidence -Encoding utf8
    Write-Host "PASS application evidence recorded — $($counts.tests) tests"
} else {
    if(-not(Test-Path -LiteralPath $Evidence -PathType Leaf)){throw 'Application test evidence missing'}
    $record=Get-Content -LiteralPath $Evidence -Raw | ConvertFrom-Json
    if($record.schema -ne 'hekayti-application-evidence/2' -or $record.status -ne 'PASS' -or $record.command -ne 'npm test' -or $record.exitCode -ne 0 -or $record.inputHash -notmatch '^[A-F0-9]{64}$' -or $record.afterHash -ne $record.inputHash -or -not $record.startedAt -or -not $record.completedAt){throw 'Malformed application test evidence'}
    $counts=Check-Log $record.logPath
    if($counts.tests -ne $record.tests -or (Get-FileHash -LiteralPath $record.logPath -Algorithm SHA256).Hash -ne $record.logHash){throw 'Application test log no longer matches'}
    if((Input-Fingerprint) -ne $record.inputHash){throw 'Application tested inputs changed; run fresh tests'}
    Write-Host "PASS exact-content application evidence reused — $($record.tests) tests; foundation/design/typecheck are not skipped"
}
