#requires -Version 7.0
. "$PSScriptRoot/../scripts/common.ps1"
$originalRoot=$script:ProjectRoot
$passed=0
function Assert([bool]$Condition,[string]$Message) { if(-not $Condition){throw $Message}; $script:passed++; Write-Host "PASS $Message" }
function Must-Fail([scriptblock]$Action,[string]$Message) { $failed=$false; try { & $Action | Out-Null } catch { $failed=$true }; Assert $failed $Message }
try {
    foreach($file in Get-ChildItem -File "$originalRoot/scripts/*.ps1","$originalRoot/tests/*.ps1") {
        $tokens=$null;$parseErrors=$null
        $null=[Management.Automation.Language.Parser]::ParseFile($file.FullName,[ref]$tokens,[ref]$parseErrors)
        Assert ($parseErrors.Count -eq 0) "PowerShell syntax: $($file.Name)"
    }
    foreach($name in @('START_HERE.md','PROJECT_CONTEXT.md','CURRENT_STATE.md','DECISIONS.md','SKILLS.md','SETUP.md','RESTORE.md')) {
        Assert (Test-Path "$originalRoot/recovery-context/$name") "context exists: $name"
        Assert ((Get-FileHash "$originalRoot/$name").Hash -eq (Get-FileHash "$originalRoot/recovery-context/$name").Hash) "context current: $name"
    }
    $context=Get-Content -Raw "$originalRoot/PROJECT_CONTEXT.md"
    Assert ($context -match 'Egypt only' -and $context -match 'Egyptian Arabic' -and $context -match 'optional' -and $context -match 'paper-cut') 'permanent product facts preserved'
    foreach($privatePath in @('.env','nested/.env.production','private/photo.png','child-photos/demo.png','customer-data/info.csv','uploads/private/image.png','auth.json','data.sqlite','secrets/key.txt','exports/private/book.pdf')) { Assert (Test-PrivatePath $privatePath) "security deny: $privatePath" }
    foreach($safePath in @('.env.example','README.md','assets/README.md','examples/synthetic.json','skills/vendor/picture-book-generator/SKILL.md','backups/README.md')) { Assert (-not (Test-PrivatePath $safePath)) "source allow: $safePath" }
    $inventory=Get-Content -Raw "$originalRoot/docs/skills-inventory.json"|ConvertFrom-Json
    Assert (@($inventory.skills|Where-Object {$_.vendoredPath}).Count -eq 42) '42 portable writing skills'
    foreach($s in $inventory.skills|Where-Object {$_.vendoredPath}) {
        Assert ((Get-FileHash (Join-Path $originalRoot $s.vendoredPath)).Hash -eq $s.sha256) "portable skill hash: $($s.name)"
    }
    $sandbox=Join-Path $originalRoot ('temp/foundation-tests/'+[guid]::NewGuid().ToString('N'))
    $fixture=Join-Path $sandbox 'source'
    $null=New-Item -ItemType Directory -Path "$fixture/scripts" -Force
    Copy-Item -LiteralPath "$originalRoot/scripts/common.ps1","$originalRoot/scripts/restore.ps1" -Destination "$fixture/scripts"
    $null=& git init -b main $fixture
    $script:ProjectRoot=$fixture
    $null=Invoke-Git @('config','user.name','Synthetic Test')
    $null=Invoke-Git @('config','user.email','synthetic@example.invalid')
    Set-Content "$fixture/.gitignore" '.env'
    Set-Content "$fixture/synthetic.txt" 'synthetic fixture only'
    $null=Invoke-Git @('add','--all')
    $null=Test-Security
    $null=Invoke-Git @('commit','-m','synthetic baseline')
    $baseline=[string](Invoke-Git @('rev-parse','HEAD'))
    $null=Invoke-Git @('tag','v0.0.1')
    Set-Content "$fixture/.env" 'LOCAL_ONLY_SYNTHETIC=fixture'
    Set-Content "$fixture/synthetic.txt" 'uncommitted work must survive'
    Must-Fail { Assert-Clean } 'dirty state blocks unsafe branch operations'
    $recovery=Join-Path $sandbox 'recovered-worktree'
    $restoreOutput=& pwsh -NoProfile -File "$fixture/scripts/restore.ps1" -Action Recover -Ref v0.0.1 -Destination $recovery 2>&1
    Assert ($LASTEXITCODE -eq 0) "non-destructive restore succeeds: $($restoreOutput -join ' ')"
    Assert ((Get-Content -Raw "$fixture/synthetic.txt") -match 'uncommitted work must survive') 'current uncommitted source preserved'
    Assert (Test-Path "$fixture/.env") 'ignored private fixture preserved'
    Assert (([string](Invoke-Git @('rev-parse','HEAD') -Root $recovery)) -eq $baseline) 'recovery worktree uses stable SHA'
    $null=& pwsh -NoProfile -File "$fixture/scripts/restore.ps1" -Action ReturnMain 2>&1
    Assert ($LASTEXITCODE -ne 0) 'return to main refuses dirty current work'
    $null=& pwsh -NoProfile -File "$fixture/scripts/restore.ps1" -Action Recover -Ref v0.0.1 -Destination $recovery 2>&1
    Assert ($LASTEXITCODE -ne 0) 'existing restore destination is preserved'
    $credential='gh'+'p_'+('A'*36)
    Set-Content "$fixture/credential-fixture.txt" $credential
    $null=Invoke-Git @('add','credential-fixture.txt')
    Must-Fail { Test-Security -Staged } 'staged credential fixture blocked without leaking value'
    $null=Invoke-Git @('commit','-m','synthetic secret fixture to test historical scanning')
    # Existing fixture files only: replacing this synthetic value demonstrates clean-tip/dirty-history detection.
    Set-Content "$fixture/credential-fixture.txt" 'redacted synthetic fixture'
    $null=Invoke-Git @('add','credential-fixture.txt')
    $null=Invoke-Git @('commit','-m','redact synthetic fixture at tip')
    $null=Test-Security
    Must-Fail { Test-Security -History } 'historical credential blocked even when HEAD is clean'
    $bundle=Join-Path $sandbox 'fixture.bundle'
    $null=Invoke-Git @('bundle','create',$bundle,'--all')
    $null=Invoke-Git @('bundle','verify',$bundle)
    $clone=Join-Path $sandbox 'bundle-clone'
    $null=& git clone $bundle $clone 2>&1
    Assert ($LASTEXITCODE -eq 0) 'full-history Git bundle clones without network'
    Assert (([string](Invoke-Git @('rev-parse','v0.0.1') -Root $clone)) -eq $baseline) 'bundle retains stable tags'
    $badZip=Join-Path $sandbox 'unsafe.zip'
    $zip=[IO.Compression.ZipFile]::Open($badZip,[IO.Compression.ZipArchiveMode]::Create)
    $null=$zip.CreateEntry('../escape.txt');$zip.Dispose()
    Must-Fail { Test-ZipPaths $badZip } 'archive traversal rejected before extraction'
    Write-Host "PASS FOUNDATION TESTS — $passed assertions; synthetic fixtures retained under ignored temp/"
    exit 0
} catch { Write-Host "FAIL FOUNDATION TESTS: $_"; exit 1 }
finally { $script:ProjectRoot=$originalRoot }

