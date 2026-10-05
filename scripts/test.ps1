#requires -Version 7.0
foreach($suite in @('foundation.tests.ps1','product-design.tests.ps1')) {
    & pwsh -NoProfile -File "$PSScriptRoot/../tests/$suite"
    if($LASTEXITCODE -ne 0){exit $LASTEXITCODE}
}
exit 0
