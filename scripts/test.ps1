#requires -Version 7.0
foreach($suite in @('foundation.tests.ps1','product-design.tests.ps1')) {
    & pwsh -NoProfile -File "$PSScriptRoot/../tests/$suite"
    if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
}
if(Test-Path -LiteralPath "$PSScriptRoot/../package.json") {
    Push-Location "$PSScriptRoot/.."
    try {
        if(-not (Test-Path -LiteralPath node_modules/typescript)) { throw 'Application dependencies missing. Run npm ci first; no runtime test success is assumed.' }
        & npm run typecheck
        if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
        & npm test
        if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
    } finally { Pop-Location }
}
exit 0
